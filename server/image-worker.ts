import { db } from "@db";
import { coinImages, coinMappings } from "@db/schema";
import { eq, isNull } from "drizzle-orm";
import { InferModel } from "drizzle-orm";

// In-memory cache for runtime optimization
const imageCache = new Map<string, string>();
const priorityQueue = new Set<string>(); // Track priority tokens

// CoinGecko rate limit: 50 requests per minute
const RATE_LIMIT = 50;
const BATCH_SIZE = 1; // Process one at a time to avoid rate limits
const DELAY_BETWEEN_BATCHES = 20000; // 20 seconds between batches
const MAX_RETRIES = 3;
const RATE_LIMIT_DELAY = 61000; // 61 seconds for rate limit reset
const INITIAL_BACKOFF = 1000; // Start with 1 second

interface CoinGeckoListItem {
  id: string;
  symbol: string;
  name: string;
}

interface CoinGeckoMarketItem {
  id: string;
  image: string;
}

type CoinMapping = InferModel<typeof coinMappings>;

let lastRequestTime = Date.now();
const MIN_REQUEST_INTERVAL = 1200; // Minimum 1.2 seconds between requests

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Rate limiter function
async function enforceRateLimit(): Promise<void> {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;

  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    await sleep(MIN_REQUEST_INTERVAL - timeSinceLastRequest);
  }

  lastRequestTime = Date.now();
}

// Enhanced retry function with exponential backoff and rate limit handling
async function retry<T>(
  operation: () => Promise<T>,
  retries = MAX_RETRIES,
  backoff = INITIAL_BACKOFF
): Promise<T> {
  try {
    await enforceRateLimit();
    return await operation();
  } catch (error: any) {
    console.log(`[Image Worker] Operation failed: ${error.message}`);

    // Handle rate limit response
    if (error?.response?.status === 429 || error?.status === 429) {
      console.log(`[Image Worker] Rate limit hit, waiting ${RATE_LIMIT_DELAY/1000} seconds...`);
      await sleep(RATE_LIMIT_DELAY);
      return retry(operation, retries, backoff);
    }

    // Retry with exponential backoff for other errors
    if (retries > 0) {
      const nextBackoff = Math.min(backoff * 2, RATE_LIMIT_DELAY);
      console.log(`[Image Worker] Retrying operation in ${backoff/1000} seconds... (${retries} retries left)`);
      await sleep(backoff);
      return retry(operation, retries - 1, nextBackoff);
    }

    throw error;
  }
}

// Add token to priority queue
export function addPriorityToken(symbol: string): void {
  if (!symbol) return;
  const normalizedSymbol = symbol.toUpperCase();
  if (!priorityQueue.has(normalizedSymbol)) {
    priorityQueue.add(normalizedSymbol);
    console.log(`[Image Worker] Added priority token: ${normalizedSymbol}`);
  }
}

// Process priority queue first
async function processPriorityQueue(): Promise<void> {
  if (priorityQueue.size === 0) return;

  console.log(`[Image Worker] Processing priority queue (${priorityQueue.size} tokens)`);
  const priorityTokens = Array.from(priorityQueue);

  for (const symbol of priorityTokens) {
    try {
      console.log(`[Image Worker] Processing priority token: ${symbol}`);

      const mapping = await db
        .select()
        .from(coinMappings)
        .where(eq(coinMappings.kucoin_symbol, symbol))
        .limit(1);

      if (mapping.length > 0) {
        await fetchImagesForTokens([mapping[0].coingecko_id]);
        priorityQueue.delete(symbol);
        console.log(`[Image Worker] Successfully processed priority token: ${symbol}`);
      } else {
        console.log(`[Image Worker] No mapping found for priority token: ${symbol}`);
      }

      await sleep(DELAY_BETWEEN_BATCHES);
    } catch (error) {
      console.error(`[Image Worker] Error processing priority token ${symbol}:`, error);
      // Continue with next token
    }
  }
}

async function fetchCoinList(): Promise<CoinGeckoListItem[]> {
  return retry(async () => {
    console.log('[Image Worker] Fetching coin list from CoinGecko...');
    const response = await fetch('https://api.coingecko.com/api/v3/coins/list');

    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status} - ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`[Image Worker] Successfully fetched ${data.length} coins from CoinGecko`);
    return data;
  });
}

async function processCoinBatch(coins: CoinGeckoListItem[]): Promise<void> {
  for (const coin of coins) {
    try {
      const kucoinSymbol = `${coin.symbol.toUpperCase()}-USDT`;

      // Skip if not in priority queue during initial setup
      if (!priorityQueue.has(kucoinSymbol)) continue;

      await retry(async () => {
        try {
          await db.insert(coinMappings).values({
            kucoin_symbol: kucoinSymbol,
            coingecko_id: coin.id,
          }).onConflictDoUpdate({
            target: coinMappings.kucoin_symbol,
            set: { coingecko_id: coin.id },
          });
          console.log(`[Image Worker] Successfully mapped ${kucoinSymbol} to ${coin.id}`);
        } catch (dbError) {
          console.error(`[Image Worker] Database error for ${kucoinSymbol}:`, dbError);
          throw dbError;
        }
      });
    } catch (error) {
      console.error(`[Image Worker] Failed to map coin after all retries:`, error);
      // Continue with next coin
    }
  }
}

async function updateCoinMappings(): Promise<void> {
  console.log('[Image Worker] Starting coin mappings update...');

  try {
    const coins = await fetchCoinList();
    if (coins.length === 0) {
      console.log('[Image Worker] No coins fetched, skipping mapping update');
      return;
    }

    // Process only priority tokens initially
    const priorityCoins = coins.filter(coin =>
      priorityQueue.has(`${coin.symbol.toUpperCase()}-USDT`)
    );

    if (priorityCoins.length > 0) {
      console.log(`[Image Worker] Processing ${priorityCoins.length} priority coins`);
      await processCoinBatch(priorityCoins);
    }

    console.log('[Image Worker] Priority coin mappings update completed');
  } catch (error) {
    console.error('[Image Worker] Failed to update coin mappings:', error);
  }
}

async function fetchImagesForTokens(coingeckoIds: string[]): Promise<void> {
  if (!coingeckoIds.length) return;

  const batchIds = coingeckoIds.slice(0, BATCH_SIZE);
  console.log(`[Image Worker] Fetching images for tokens: ${batchIds.join(', ')}`);

  try {
    const response = await retry(async () => {
      const resp = await fetch(
        `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${batchIds.join(',')}&per_page=${BATCH_SIZE}&sparkline=false`
      );

      if (!resp.ok) {
        throw new Error(`CoinGecko API error: ${resp.status}`);
      }

      return resp;
    });

    const data: CoinGeckoMarketItem[] = await response.json();
    console.log(`[Image Worker] Retrieved ${data.length} images`);

    for (const coin of data) {
      if (!coin.id || !coin.image) continue;

      try {
        await retry(async () => {
          await db.insert(coinImages).values({
            coingecko_id: coin.id,
            image_url: coin.image,
          }).onConflictDoUpdate({
            target: coinImages.coingecko_id,
            set: {
              image_url: coin.image,
              last_fetched: new Date(),
              updated_at: new Date()
            },
          });

          // Update memory cache
          imageCache.set(coin.id, coin.image);
          console.log(`[Image Worker] Stored image for ${coin.id}`);
        });
      } catch (error) {
        console.error(`[Image Worker] Failed to store image for ${coin.id} after retries:`, error);
      }
    }

    // Process remaining tokens if any
    if (coingeckoIds.length > BATCH_SIZE) {
      console.log('[Image Worker] Waiting before processing next batch...');
      await sleep(DELAY_BETWEEN_BATCHES);
      await fetchImagesForTokens(coingeckoIds.slice(BATCH_SIZE));
    }
  } catch (error) {
    console.error('[Image Worker] Error fetching images:', error);
  }
}

async function processUnmappedTokens(): Promise<void> {
  // First process priority queue
  await processPriorityQueue();

  console.log('[Image Worker] Starting to process unmapped tokens...');

  try {
    // Get tokens without images using EXISTS clause
    const unmappedTokens = await db
      .select()
      .from(coinMappings)
      .where(
        isNull(
          db.select({ id: coinImages.id })
            .from(coinImages)
            .where(eq(coinImages.coingecko_id, coinMappings.coingecko_id))
            .limit(1)
        )
      )
      .limit(5); // Process only 5 tokens at a time initially

    console.log(`[Image Worker] Found ${unmappedTokens.length} unmapped tokens`);

    if (unmappedTokens.length > 0) {
      await fetchImagesForTokens(unmappedTokens.map(t => t.coingecko_id));
    }

    console.log('[Image Worker] Completed processing unmapped tokens');
  } catch (error) {
    console.error('[Image Worker] Error processing unmapped tokens:', error);
  }
}

// Clear memory cache periodically (every hour)
setInterval(() => {
  console.log('[Image Worker] Clearing memory cache');
  imageCache.clear();
}, 3600000);

export async function startImageWorker(): Promise<void> {
  console.log('[Image Worker] Starting...');

  try {
    // Initial update of coin mappings
    await updateCoinMappings();

    // Start processing unmapped tokens
    await processUnmappedTokens();

    // Schedule periodic updates (every 24 hours)
    setInterval(async () => {
      console.log('[Image Worker] Running scheduled update...');
      try {
        await updateCoinMappings();
        await processUnmappedTokens();
      } catch (error) {
        console.error('[Image Worker] Scheduled update failed:', error);
      }
    }, 86400000);

    console.log('[Image Worker] Successfully initialized');
  } catch (error) {
    console.error('[Image Worker] Initialization error:', error);
    // Don't throw, allow the server to continue running
  }
}

export async function getTokenImage(symbol: string): Promise<string> {
  try {
    // Add to priority queue if not already cached
    if (!imageCache.has(symbol)) {
      addPriorityToken(symbol);
    }

    const mappings = await db
      .select()
      .from(coinMappings)
      .where(eq(coinMappings.kucoin_symbol, symbol))
      .limit(1);

    if (mappings.length === 0) {
      console.log(`[Image Worker] No mapping found for symbol: ${symbol}`);
      return '';
    }

    const coingeckoId = mappings[0].coingecko_id;

    // Check memory cache
    if (imageCache.has(coingeckoId)) {
      return imageCache.get(coingeckoId)!;
    }

    // Check database
    const images = await db
      .select()
      .from(coinImages)
      .where(eq(coinImages.coingecko_id, coingeckoId))
      .limit(1);

    if (images.length > 0) {
      // Update memory cache and return
      imageCache.set(coingeckoId, images[0].image_url);
      return images[0].image_url;
    }

    // If not found, trigger a fetch for this token
    console.log(`[Image Worker] Fetching new image for ${symbol} (${coingeckoId})`);
    await fetchImagesForTokens([coingeckoId]);

    // Try to get the image one more time
    const refreshedImages = await db
      .select()
      .from(coinImages)
      .where(eq(coinImages.coingecko_id, coingeckoId))
      .limit(1);

    return refreshedImages.length > 0 ? refreshedImages[0].image_url : '';
  } catch (error) {
    console.error(`[Image Worker] Error getting token image for ${symbol}:`, error);
    return '';
  }
}
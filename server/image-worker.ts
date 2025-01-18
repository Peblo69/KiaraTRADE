import { db } from "@db";
import { coinImages, coinMappings } from "@db/schema";
import { eq, isNull } from "drizzle-orm";
import axios from 'axios';

// In-memory cache for runtime optimization
const imageCache = new Map<string, string>();
const priorityQueue = new Set<string>();
let isProcessingQueue = false;

// Configuration
const RATE_LIMIT = 50; // CoinGecko rate limit: 50 requests per minute
const DELAY_BETWEEN_REQUESTS = 1200; // 1.2 seconds between requests
const MAX_RETRIES = 3;
const RATE_LIMIT_DELAY = 61000; // 61 seconds when rate limit is hit

// Common token mappings for quick lookup
const COMMON_TOKENS: Record<string, string> = {
  'BTC-USDT': 'bitcoin',
  'ETH-USDT': 'ethereum',
  'SOL-USDT': 'solana',
  'DOGE-USDT': 'dogecoin',
  'XRP-USDT': 'ripple',
  'ADA-USDT': 'cardano',
  'SHIB-USDT': 'shiba-inu',
  'LTC-USDT': 'litecoin',
  'BONK-USDT': 'bonk',
  'PEPE-USDT': 'pepe',
  'MATIC-USDT': 'matic-network',
  'DOT-USDT': 'polkadot',
  'LINK-USDT': 'chainlink',
  'AVAX-USDT': 'avalanche-2',
  'UNI-USDT': 'uniswap',
  'ATOM-USDT': 'cosmos',
  'TRX-USDT': 'tron',
  'DAI-USDT': 'dai',
  'AAVE-USDT': 'aave',
};

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Enhanced retry function with exponential backoff
async function retry<T>(
  operation: () => Promise<T>,
  retries = MAX_RETRIES,
  delay = 1000,
  context = ''
): Promise<T> {
  try {
    return await operation();
  } catch (error: any) {
    console.log(`[Image Worker] ${context} - Operation failed:`, error.message);

    if (error?.response?.status === 429) {
      console.log(`[Image Worker] ${context} - Rate limit hit, waiting ${RATE_LIMIT_DELAY/1000}s...`);
      await sleep(RATE_LIMIT_DELAY);
      return retry(operation, retries, delay, context);
    }

    if (retries > 0) {
      const nextDelay = Math.min(delay * 2, RATE_LIMIT_DELAY);
      console.log(`[Image Worker] ${context} - Retrying in ${delay/1000}s... (${retries} retries left)`);
      await sleep(delay);
      return retry(operation, retries - 1, nextDelay, context);
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
    // Start processing queue if not already running
    if (!isProcessingQueue) {
      processQueue().catch(console.error);
    }
  }
}

// Process the priority queue
async function processQueue(): Promise<void> {
  if (isProcessingQueue || priorityQueue.size === 0) return;

  isProcessingQueue = true;
  console.log(`[Image Worker] Starting queue processing (${priorityQueue.size} tokens)`);

  try {
    const tokens = Array.from(priorityQueue);
    for (const symbol of tokens) {
      try {
        // Check if already in cache or database before processing
        const existingImage = await checkExistingImage(symbol);
        if (existingImage) {
          console.log(`[Image Worker] Image already exists for ${symbol}, skipping processing`);
          priorityQueue.delete(symbol);
          continue;
        }

        await processToken(symbol);
        priorityQueue.delete(symbol);
        await sleep(DELAY_BETWEEN_REQUESTS);
      } catch (error) {
        console.error(`[Image Worker] Error processing ${symbol}:`, error);
      }
    }
  } finally {
    isProcessingQueue = false;
    console.log('[Image Worker] Queue processing completed');
  }
}

// Check if image already exists in cache or database
async function checkExistingImage(symbol: string): Promise<boolean> {
  // Check common tokens first
  if (COMMON_TOKENS[symbol]) {
    const coingeckoId = COMMON_TOKENS[symbol];

    // Check memory cache
    if (imageCache.has(coingeckoId)) {
      console.log(`[Image Worker] Found ${symbol} in memory cache`);
      return true;
    }

    // Check database
    const images = await db
      .select()
      .from(coinImages)
      .where(eq(coinImages.coingecko_id, coingeckoId))
      .limit(1);

    if (images.length > 0) {
      console.log(`[Image Worker] Found ${symbol} in database`);
      imageCache.set(coingeckoId, images[0].image_url);
      return true;
    }
  }

  // Check database for non-common tokens
  const mapping = await db
    .select()
    .from(coinMappings)
    .where(eq(coinMappings.kucoin_symbol, symbol))
    .limit(1);

  if (mapping.length > 0) {
    const coingeckoId = mapping[0].coingecko_id;

    // Check memory cache
    if (imageCache.has(coingeckoId)) {
      console.log(`[Image Worker] Found ${symbol} in memory cache`);
      return true;
    }

    // Check database
    const images = await db
      .select()
      .from(coinImages)
      .where(eq(coinImages.coingecko_id, coingeckoId))
      .limit(1);

    if (images.length > 0) {
      console.log(`[Image Worker] Found ${symbol} in database`);
      imageCache.set(coingeckoId, images[0].image_url);
      return true;
    }
  }

  return false;
}

// Process a single token
async function processToken(symbol: string): Promise<void> {
  console.log(`[Image Worker] Processing token: ${symbol}`);
  try {
    // Get or create CoinGecko mapping
    const coingeckoId = await getCoingeckoId(symbol);
    if (!coingeckoId) {
      console.log(`[Image Worker] No CoinGecko mapping for ${symbol}`);
      return;
    }

    // Fetch and store image
    await fetchAndStoreImage(coingeckoId, symbol);
  } catch (error) {
    console.error(`[Image Worker] Failed to process token ${symbol}:`, error);
    throw error;
  }
}

// Get CoinGecko ID for a symbol
async function getCoingeckoId(symbol: string): Promise<string | null> {
  console.log(`[Image Worker] Getting CoinGecko ID for ${symbol}`);
  try {
    // Check common tokens first
    if (COMMON_TOKENS[symbol]) {
      console.log(`[Image Worker] Found ${symbol} in common tokens mapping`);
      return COMMON_TOKENS[symbol];
    }

    // Check database
    const mapping = await db
      .select()
      .from(coinMappings)
      .where(eq(coinMappings.kucoin_symbol, symbol))
      .limit(1);

    if (mapping.length > 0) {
      console.log(`[Image Worker] Found ${symbol} in database mapping`);
      return mapping[0].coingecko_id;
    }

    // Fetch from CoinGecko if not in database
    const cleanSymbol = symbol.replace('-USDT', '').toLowerCase();
    console.log(`[Image Worker] Searching CoinGecko for ${cleanSymbol}`);

    const response = await retry(
      async () => axios.get(`https://api.coingecko.com/api/v3/search?query=${cleanSymbol}`),
      MAX_RETRIES,
      1000,
      `CoinGecko search for ${cleanSymbol}`
    );

    const coins = response.data.coins;
    if (coins && coins.length > 0) {
      // First try exact symbol match
      let match = coins.find((c: any) => 
        c.symbol.toLowerCase() === cleanSymbol.toLowerCase()
      );

      // If no exact match, try fuzzy match with symbol and name
      if (!match) {
        match = coins.find((c: any) => 
          c.symbol.toLowerCase().includes(cleanSymbol) ||
          c.name.toLowerCase().includes(cleanSymbol)
        );
      }

      if (match) {
        console.log(`[Image Worker] Found match for ${symbol}: ${match.id}`);
        // Store mapping
        await db.insert(coinMappings).values({
          kucoin_symbol: symbol,
          coingecko_id: match.id,
        }).onConflictDoUpdate({
          target: coinMappings.kucoin_symbol,
          set: { coingecko_id: match.id }
        });
        return match.id;
      }
    }

    console.log(`[Image Worker] No match found for ${symbol}`);
    return null;
  } catch (error) {
    console.error(`[Image Worker] Error getting CoinGecko ID for ${symbol}:`, error);
    return null;
  }
}

// Fetch and store image for a token
async function fetchAndStoreImage(coingeckoId: string, symbol: string): Promise<void> {
  console.log(`[Image Worker] Fetching image for ${coingeckoId} (${symbol})`);
  try {
    const response = await retry(
      async () => axios.get(`https://api.coingecko.com/api/v3/coins/${coingeckoId}`),
      MAX_RETRIES,
      1000,
      `CoinGecko image fetch for ${coingeckoId}`
    );

    const imageUrl = response.data.image?.large;
    if (!imageUrl) {
      console.log(`[Image Worker] No image found for ${coingeckoId}`);
      return;
    }

    console.log(`[Image Worker] Got image URL for ${coingeckoId}: ${imageUrl}`);

    // Store in database
    await db.insert(coinImages).values({
      coingecko_id: coingeckoId,
      image_url: imageUrl,
    }).onConflictDoUpdate({
      target: coinImages.coingecko_id,
      set: { 
        image_url: imageUrl,
        last_fetched: new Date(),
        updated_at: new Date()
      }
    });

    // Update memory cache
    imageCache.set(coingeckoId, imageUrl);
    console.log(`[Image Worker] Stored image for ${coingeckoId}`);
  } catch (error) {
    console.error(`[Image Worker] Error fetching image for ${coingeckoId}:`, error);
    throw error;
  }
}

// Basic initialization function
export async function startImageWorker(): Promise<void> {
  console.log('[Image Worker] Starting with basic configuration...');

  try {
    // Verify database connection
    await db.select().from(coinMappings).limit(1);
    console.log('[Image Worker] Database connection verified');

    // Clear existing caches
    imageCache.clear();
    priorityQueue.clear();
    isProcessingQueue = false;

    // Pre-populate common token mappings
    for (const [symbol, coingeckoId] of Object.entries(COMMON_TOKENS)) {
      try {
        await db.insert(coinMappings).values({
          kucoin_symbol: symbol,
          coingecko_id: coingeckoId,
        }).onConflictDoUpdate({
          target: coinMappings.kucoin_symbol,
          set: { coingecko_id: coingeckoId }
        });
      } catch (error) {
        console.error(`[Image Worker] Error pre-populating mapping for ${symbol}:`, error);
      }
    }

    // Start processing any existing queue items
    processQueue().catch(console.error);

    console.log('[Image Worker] Successfully initialized');
  } catch (error) {
    console.error('[Image Worker] Initialization error:', error);
    throw error;
  }
}

// Get token image with priority queueing
export async function getTokenImage(symbol: string): Promise<string> {
  console.log(`[Image Worker] Getting image for ${symbol}`);
  try {
    // Check common tokens first
    if (COMMON_TOKENS[symbol]) {
      const coingeckoId = COMMON_TOKENS[symbol];
      console.log(`[Image Worker] Found ${symbol} in common tokens`);

      // Check memory cache
      if (imageCache.has(coingeckoId)) {
        console.log(`[Image Worker] Found ${symbol} in memory cache`);
        return imageCache.get(coingeckoId)!;
      }

      // Check database
      const images = await db
        .select()
        .from(coinImages)
        .where(eq(coinImages.coingecko_id, coingeckoId))
        .limit(1);

      if (images.length > 0) {
        console.log(`[Image Worker] Found ${symbol} in database`);
        imageCache.set(coingeckoId, images[0].image_url);
        return images[0].image_url;
      }

      // Queue for fetching
      console.log(`[Image Worker] Queueing ${symbol} for fetching`);
      addPriorityToken(symbol);
      return '';
    }

    const mappings = await db
      .select()
      .from(coinMappings)
      .where(eq(coinMappings.kucoin_symbol, symbol))
      .limit(1);

    if (mappings.length === 0) {
      console.log(`[Image Worker] No mapping found for ${symbol}, queueing`);
      addPriorityToken(symbol);
      return '';
    }

    const coingeckoId = mappings[0].coingecko_id;

    // Check memory cache
    if (imageCache.has(coingeckoId)) {
      console.log(`[Image Worker] Found ${symbol} in memory cache`);
      return imageCache.get(coingeckoId)!;
    }

    // Check database
    const images = await db
      .select()
      .from(coinImages)
      .where(eq(coinImages.coingecko_id, coingeckoId))
      .limit(1);

    if (images.length > 0) {
      console.log(`[Image Worker] Found ${symbol} in database`);
      imageCache.set(coingeckoId, images[0].image_url);
      return images[0].image_url;
    }

    // Queue for fetching if not found
    console.log(`[Image Worker] Queueing ${symbol} for fetching`);
    addPriorityToken(symbol);
    return '';
  } catch (error) {
    console.error(`[Image Worker] Error getting token image for ${symbol}:`, error);
    return '';
  }
}
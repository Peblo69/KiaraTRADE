import { db } from "@db";
import { coinImages, coinMappings } from "@db/schema";
import { eq, isNull } from "drizzle-orm";

// In-memory cache for runtime optimization
const imageCache = new Map<string, string>();

// CoinGecko rate limit: 50 requests per minute
const RATE_LIMIT = 50;
const BATCH_SIZE = 10; // Reduced batch size for better stability
const DELAY_BETWEEN_BATCHES = 2000; // Increased delay between requests

interface CoinGeckoListItem {
  id: string;
  symbol: string;
  name: string;
}

interface CoinGeckoMarketItem {
  id: string;
  image: string;
}

async function fetchCoinList(): Promise<CoinGeckoListItem[]> {
  try {
    const response = await fetch('https://api.coingecko.com/api/v3/coins/list');
    if (!response.ok) {
      if (response.status === 429) {
        console.log('[Image Worker] Rate limit hit, waiting 61 seconds...');
        await new Promise(resolve => setTimeout(resolve, 61000));
        return fetchCoinList();
      }
      throw new Error(`CoinGecko API error: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('[Image Worker] Error fetching coin list:', error);
    return [];
  }
}

async function updateCoinMappings(): Promise<void> {
  console.log('[Image Worker] Updating coin mappings...');
  try {
    const coins = await fetchCoinList();
    console.log(`[Image Worker] Found ${coins.length} coins from CoinGecko`);

    // Process in smaller batches
    for (let i = 0; i < coins.length; i += BATCH_SIZE) {
      const batch = coins.slice(i, i + BATCH_SIZE);

      try {
        // Process each coin in the batch
        for (const coin of batch) {
          const kucoinSymbol = `${coin.symbol.toUpperCase()}-USDT`;

          try {
            await db.insert(coinMappings).values({
              kucoin_symbol: kucoinSymbol,
              coingecko_id: coin.id,
            }).onConflictDoUpdate({
              target: coinMappings.kucoin_symbol,
              set: { coingecko_id: coin.id },
            });
          } catch (dbError) {
            console.error(`[Image Worker] Error updating mapping for ${kucoinSymbol}:`, dbError);
            continue; // Skip this coin but continue with others
          }
        }
      } catch (batchError) {
        console.error('[Image Worker] Batch processing error:', batchError);
        continue; // Skip problematic batch but continue with others
      }

      // Delay between batches
      if (i + BATCH_SIZE < coins.length) {
        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
      }
    }

    console.log('[Image Worker] Coin mappings update completed');
  } catch (error) {
    console.error('[Image Worker] Failed to update coin mappings:', error);
  }
}

async function fetchImagesForTokens(coingeckoIds: string[]): Promise<void> {
  if (coingeckoIds.length === 0) return;

  try {
    console.log(`[Image Worker] Fetching images for ${coingeckoIds.length} tokens...`);

    const response = await fetch(
      `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${coingeckoIds.join(',')}&per_page=${BATCH_SIZE}&sparkline=false`
    );

    if (!response.ok) {
      if (response.status === 429) {
        console.log('[Image Worker] Rate limit hit, waiting 61 seconds...');
        await new Promise(resolve => setTimeout(resolve, 61000));
        return fetchImagesForTokens(coingeckoIds);
      }
      throw new Error(`CoinGecko API error: ${response.status}`);
    }

    const data: CoinGeckoMarketItem[] = await response.json();
    console.log(`[Image Worker] Retrieved ${data.length} images`);

    // Store images in database and cache
    for (const coin of data) {
      if (coin.id && coin.image) {
        try {
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
        } catch (dbError) {
          console.error(`[Image Worker] Failed to store image for ${coin.id}:`, dbError);
          continue;
        }
      }
    }
  } catch (error) {
    console.error('[Image Worker] Error fetching images:', error);
  }
}

async function processUnmappedTokens(): Promise<void> {
  try {
    console.log('[Image Worker] Processing unmapped tokens...');

    // Get all mappings that don't have corresponding images
    const unmappedTokens = await db
      .select()
      .from(coinMappings)
      .where(
        isNull(
          db.select()
            .from(coinImages)
            .where(eq(coinImages.coingecko_id, coinMappings.coingecko_id))
            .limit(1)
        )
      );

    console.log(`[Image Worker] Found ${unmappedTokens.length} unmapped tokens`);

    // Process in batches
    for (let i = 0; i < unmappedTokens.length; i += BATCH_SIZE) {
      const batch = unmappedTokens.slice(i, i + BATCH_SIZE);
      await fetchImagesForTokens(batch.map(t => t.coingecko_id));

      // Delay between batches to respect rate limit
      if (i + BATCH_SIZE < unmappedTokens.length) {
        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
      }
    }

    console.log('[Image Worker] Completed processing unmapped tokens');
  } catch (error) {
    console.error('[Image Worker] Error processing unmapped tokens:', error);
  }
}

// Clear memory cache periodically (every hour)
setInterval(() => {
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
      await updateCoinMappings();
      await processUnmappedTokens();
    }, 86400000);

    console.log('[Image Worker] Successfully initialized');
  } catch (error) {
    console.error('[Image Worker] Initialization error:', error);
    // Don't throw the error, allow the server to continue running
  }
}

export async function getTokenImage(symbol: string): Promise<string> {
  try {
    // Check memory cache first
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

    console.log(`[Image Worker] Fetching new image for ${symbol} (${coingeckoId})`);
    // If not found, trigger a fetch for this token
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
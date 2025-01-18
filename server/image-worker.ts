import { db } from "@db";
import { coinImages, coinMappings } from "@db/schema";
import { eq } from "drizzle-orm";
import axios from 'axios';

// In-memory cache for runtime optimization
const imageCache = new Map<string, string>();
const priorityQueue = new Set<string>();
let isProcessingQueue = false;

// Configuration
const RATE_LIMIT = 1800; // KuCoin allows 1800 requests per minute
const DELAY_BETWEEN_REQUESTS = 50; // 50ms between requests (~1200 requests/minute)
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

// Fast database-only image check
async function getStoredImage(symbol: string): Promise<string | null> {
  try {
    // Check common tokens first (fastest path)
    if (COMMON_TOKENS[symbol]) {
      const coingeckoId = COMMON_TOKENS[symbol];

      // Check memory cache
      if (imageCache.has(coingeckoId)) {
        return imageCache.get(coingeckoId) || null;
      }

      // Check database directly
      const image = await db
        .select()
        .from(coinImages)
        .where(eq(coinImages.coingecko_id, coingeckoId))
        .limit(1);

      if (image.length > 0) {
        imageCache.set(coingeckoId, image[0].image_url);
        return image[0].image_url;
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
        return imageCache.get(coingeckoId) || null;
      }

      // Check database
      const image = await db
        .select()
        .from(coinImages)
        .where(eq(coinImages.coingecko_id, coingeckoId))
        .limit(1);

      if (image.length > 0) {
        imageCache.set(coingeckoId, image[0].image_url);
        return image[0].image_url;
      }
    }

    return null;
  } catch (error) {
    console.error(`[Image Worker] Database error for ${symbol}:`, error);
    return null;
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
        // Check if already in database before processing
        const storedImage = await getStoredImage(symbol);
        if (storedImage) {
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
  try {
    // Check common tokens first
    if (COMMON_TOKENS[symbol]) {
      return COMMON_TOKENS[symbol];
    }

    // Check database
    const mapping = await db
      .select()
      .from(coinMappings)
      .where(eq(coinMappings.kucoin_symbol, symbol))
      .limit(1);

    if (mapping.length > 0) {
      return mapping[0].coingecko_id;
    }

    // Fetch from CoinGecko if not in database
    const cleanSymbol = symbol.replace('-USDT', '').toLowerCase();

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

    return null;
  } catch (error) {
    console.error(`[Image Worker] Error getting CoinGecko ID for ${symbol}:`, error);
    return null;
  }
}

// Fetch and store image for a token
async function fetchAndStoreImage(coingeckoId: string, symbol: string): Promise<void> {
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

// Get token image with fast database check
export async function getTokenImage(symbol: string): Promise<string> {
  try {
    // Try to get from database first (fast path)
    const storedImage = await getStoredImage(symbol);
    if (storedImage) {
      return storedImage;
    }

    // Queue for background processing if not found
    addPriorityToken(symbol);
    return '';
  } catch (error) {
    console.error(`[Image Worker] Error getting token image for ${symbol}:`, error);
    return '';
  }
}

// Basic initialization function
export async function startImageWorker(): Promise<void> {
  console.log('[Image Worker] Starting with basic configuration...');

  try {
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
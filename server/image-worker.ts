import { db } from "@db";
import { coinImages, coinMappings } from "@db/schema";
import { eq } from "drizzle-orm";
import axios from 'axios';

// In-memory cache for runtime optimization
const imageCache = new Map<string, string>();
const priorityQueue = new Set<string>();
let isProcessingQueue = false;
let lastProcessTime = 0;

// Configuration
const BATCH_SIZE = 50; // Process 50 tokens at a time
const BATCH_INTERVAL = 30000; // Process batch every 30 seconds
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
      await sleep(delay);
      return retry(operation, retries - 1, nextDelay, context);
    }

    throw error;
  }
}

// Fast database-only image check
async function getStoredImage(symbol: string): Promise<string | null> {
  try {
    // Check memory cache first
    const cacheKey = symbol.toUpperCase();
    if (imageCache.has(cacheKey)) {
      return imageCache.get(cacheKey) || null;
    }

    // Check common tokens
    if (COMMON_TOKENS[symbol]) {
      const coingeckoId = COMMON_TOKENS[symbol];
      const image = await db
        .select()
        .from(coinImages)
        .where(eq(coinImages.coingecko_id, coingeckoId))
        .limit(1);

      if (image.length > 0) {
        imageCache.set(cacheKey, image[0].image_url);
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
      const image = await db
        .select()
        .from(coinImages)
        .where(eq(coinImages.coingecko_id, coingeckoId))
        .limit(1);

      if (image.length > 0) {
        imageCache.set(cacheKey, image[0].image_url);
        return image[0].image_url;
      }
    }

    return null;
  } catch (error) {
    console.error(`[Image Worker] Database error for ${symbol}:`, error);
    return null;
  }
}

// Add token to priority queue with rate limiting
export function addPriorityToken(symbol: string): void {
  if (!symbol) return;
  const normalizedSymbol = symbol.toUpperCase();

  // Don't add if already in queue
  if (priorityQueue.has(normalizedSymbol)) return;

  priorityQueue.add(normalizedSymbol);

  // Start processing if enough time has passed
  const now = Date.now();
  if (now - lastProcessTime >= BATCH_INTERVAL) {
    processQueue().catch(console.error);
  }
}

// Process the priority queue in batches
async function processQueue(): Promise<void> {
  if (isProcessingQueue || priorityQueue.size === 0) return;

  isProcessingQueue = true;
  lastProcessTime = Date.now();

  try {
    const tokens = Array.from(priorityQueue);
    const batches = [];

    // Split into batches
    for (let i = 0; i < tokens.length; i += BATCH_SIZE) {
      batches.push(tokens.slice(i, i + BATCH_SIZE));
    }

    for (const batch of batches) {
      await Promise.all(
        batch.map(async (symbol) => {
          try {
            // Skip if already in database
            const storedImage = await getStoredImage(symbol);
            if (storedImage) {
              priorityQueue.delete(symbol);
              return;
            }

            await processToken(symbol);
            priorityQueue.delete(symbol);
          } catch (error) {
            console.error(`[Image Worker] Error processing ${symbol}:`, error);
          }
        })
      );

      // Wait between batches to respect rate limits
      if (batches.indexOf(batch) < batches.length - 1) {
        await sleep(1000);
      }
    }
  } finally {
    isProcessingQueue = false;
  }
}

// Process a single token
async function processToken(symbol: string): Promise<void> {
  try {
    const coingeckoId = await getCoingeckoId(symbol);
    if (!coingeckoId) return;
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

    // Search CoinGecko as last resort
    const cleanSymbol = symbol.replace('-USDT', '').toLowerCase();
    const response = await retry(
      async () => axios.get(`https://api.coingecko.com/api/v3/search?query=${cleanSymbol}`),
      MAX_RETRIES,
      1000,
      `CoinGecko search for ${cleanSymbol}`
    );

    const coins = response.data.coins;
    if (coins && coins.length > 0) {
      const match = coins.find((c: any) => 
        c.symbol.toLowerCase() === cleanSymbol.toLowerCase()
      );

      if (match) {
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
    if (!imageUrl) return;

    // Store in database and cache
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

    imageCache.set(symbol, imageUrl);
  } catch (error) {
    console.error(`[Image Worker] Error fetching image for ${coingeckoId}:`, error);
    throw error;
  }
}

// Get token image with fast path lookup
export async function getTokenImage(symbol: string): Promise<string> {
  try {
    const storedImage = await getStoredImage(symbol);
    if (storedImage) return storedImage;

    // Queue for background processing only if not already queued
    if (!priorityQueue.has(symbol)) {
      addPriorityToken(symbol);
    }

    return '';
  } catch (error) {
    console.error(`[Image Worker] Error getting token image for ${symbol}:`, error);
    return '';
  }
}

// Initialize worker
export async function startImageWorker(): Promise<void> {
  console.log('[Image Worker] Starting with basic configuration...');

  try {
    // Clear caches
    imageCache.clear();
    priorityQueue.clear();
    isProcessingQueue = false;
    lastProcessTime = 0;

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

    console.log('[Image Worker] Successfully initialized');
  } catch (error) {
    console.error('[Image Worker] Initialization error:', error);
    throw error;
  }
}
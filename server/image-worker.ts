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
const DELAY_BETWEEN_REQUESTS = 1200; // 1.2 seconds between requests (to stay under rate limit)
const MAX_RETRIES = 3;
const RATE_LIMIT_DELAY = 61000; // 61 seconds when rate limit is hit

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Enhanced retry function with exponential backoff
async function retry<T>(
  operation: () => Promise<T>,
  retries = MAX_RETRIES,
  delay = 1000
): Promise<T> {
  try {
    return await operation();
  } catch (error: any) {
    if (error?.response?.status === 429) {
      console.log('[Image Worker] Rate limit hit, waiting...');
      await sleep(RATE_LIMIT_DELAY);
      return retry(operation, retries, delay);
    }

    if (retries > 0) {
      await sleep(delay);
      return retry(operation, retries - 1, delay * 2);
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
        await processToken(symbol);
        priorityQueue.delete(symbol);
        await sleep(DELAY_BETWEEN_REQUESTS);
      } catch (error) {
        console.error(`[Image Worker] Error processing ${symbol}:`, error);
        // Continue with next token
      }
    }
  } finally {
    isProcessingQueue = false;
    console.log('[Image Worker] Queue processing completed');
  }
}

// Process a single token
async function processToken(symbol: string): Promise<void> {
  try {
    // Check if we already have the image
    const existingImage = await getTokenImage(symbol);
    if (existingImage) {
      console.log(`[Image Worker] Image already exists for ${symbol}`);
      return;
    }

    // Get or create CoinGecko mapping
    const coingeckoId = await getCoingeckoId(symbol);
    if (!coingeckoId) {
      console.log(`[Image Worker] No CoinGecko mapping for ${symbol}`);
      return;
    }

    // Fetch and store image
    await fetchAndStoreImage(coingeckoId);
  } catch (error) {
    console.error(`[Image Worker] Failed to process token ${symbol}:`, error);
    throw error;
  }
}

// Get CoinGecko ID for a symbol
async function getCoingeckoId(symbol: string): Promise<string | null> {
  try {
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
    const response = await retry(async () => 
      axios.get(`https://api.coingecko.com/api/v3/search?query=${cleanSymbol}`)
    );

    const coins = response.data.coins;
    if (coins && coins.length > 0) {
      // Find best match
      const match = coins.find((c: any) => 
        c.symbol.toLowerCase() === cleanSymbol.toLowerCase()
      );

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
async function fetchAndStoreImage(coingeckoId: string): Promise<void> {
  try {
    const response = await retry(async () => 
      axios.get(`https://api.coingecko.com/api/v3/coins/${coingeckoId}`)
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
  try {
    const mappings = await db
      .select()
      .from(coinMappings)
      .where(eq(coinMappings.kucoin_symbol, symbol))
      .limit(1);

    if (mappings.length === 0) {
      addPriorityToken(symbol);
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
      imageCache.set(coingeckoId, images[0].image_url);
      return images[0].image_url;
    }

    // Queue for fetching if not found
    addPriorityToken(symbol);
    return '';
  } catch (error) {
    console.error(`[Image Worker] Error getting token image for ${symbol}:`, error);
    return '';
  }
}
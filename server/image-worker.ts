import { db } from "@db";
import { coinImages, coinMappings } from "@db/schema";
import { eq, isNull } from "drizzle-orm";

// In-memory cache for runtime optimization
const imageCache = new Map<string, string>();
const priorityQueue = new Set<string>();

// Basic rate limiting config
const DELAY_BETWEEN_REQUESTS = 2000; // 2 seconds between requests
const MAX_RETRIES = 3;

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Add token to priority queue
export function addPriorityToken(symbol: string): void {
  if (!symbol) return;
  const normalizedSymbol = symbol.toUpperCase();
  priorityQueue.add(normalizedSymbol);
  console.log(`[Image Worker] Added priority token: ${normalizedSymbol}`);
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

    console.log('[Image Worker] Successfully initialized');
  } catch (error) {
    console.error('[Image Worker] Initialization error:', error);
    throw error; // Let the server handle this error
  }
}

// Simplified get token image function
export async function getTokenImage(symbol: string): Promise<string> {
  try {
    // Add to priority queue for future processing
    addPriorityToken(symbol);

    // Check database for existing image
    const mappings = await db
      .select()
      .from(coinMappings)
      .where(eq(coinMappings.kucoin_symbol, symbol))
      .limit(1);

    if (mappings.length === 0) {
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

    return '';
  } catch (error) {
    console.error(`[Image Worker] Error getting token image for ${symbol}:`, error);
    return '';
  }
}
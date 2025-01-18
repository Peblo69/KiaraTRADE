import { useUnifiedTokenStore } from './unified-token-store';

// Cache for successful image loads
const imageCache = new Map<string, string>();
let hasPreloaded = false;

/**
 * Get image URL for a single token
 * Uses database-backed system with memory cache
 */
export async function getTokenImage(symbol: string): Promise<string> {
  console.log(`[Token Metadata] Fetching image for ${symbol}`);

  // Check memory cache first
  if (imageCache.has(symbol)) {
    console.log(`[Token Metadata] Cache hit for ${symbol}`);
    return imageCache.get(symbol)!;
  }

  try {
    // Try to preload all images if not done yet
    if (!hasPreloaded) {
      await preloadStoredImages();

      // Check cache again after preload
      if (imageCache.has(symbol)) {
        console.log(`[Token Metadata] Found ${symbol} after preload`);
        return imageCache.get(symbol)!;
      }
    }

    const response = await fetch(`/api/token-image/${encodeURIComponent(symbol)}`);
    if (!response.ok) {
      console.warn(`[Token Metadata] Error fetching image for ${symbol}: ${response.status}`);
      return '';
    }

    const data = await response.json();
    console.log(`[Token Metadata] API response for ${symbol}:`, data);

    if (data.imageUrl) {
      // Update memory cache
      imageCache.set(symbol, data.imageUrl);
      return data.imageUrl;
    }

    return '';
  } catch (error) {
    console.error(`[Token Metadata] Failed to fetch image for ${symbol}:`, error);
    return '';
  }
}

/**
 * Preload all stored images from the database
 */
async function preloadStoredImages(): Promise<void> {
  if (hasPreloaded) return;

  console.log('[Token Metadata] Preloading stored images...');
  try {
    const response = await fetch('/api/token-images/stored');
    if (!response.ok) {
      console.warn('[Token Metadata] Failed to preload stored images:', response.status);
      return;
    }

    const data = await response.json();
    console.log(`[Token Metadata] Preloaded ${Object.keys(data.images).length} images from database`);

    // Update memory cache with all stored images
    Object.entries(data.images).forEach(([symbol, imageUrl]) => {
      if (imageUrl) {
        imageCache.set(symbol, imageUrl as string);
      }
    });

    hasPreloaded = true;
  } catch (error) {
    console.error('[Token Metadata] Error preloading stored images:', error);
  }
}

/**
 * Preload images for a list of tokens
 */
export async function preloadTokenImages(symbols: string[]): Promise<void> {
  console.log(`[Token Metadata] Preloading images for ${symbols.length} tokens`);

  try {
    const response = await fetch('/api/token-images/bulk', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        symbols,
        priority: true // Signal these are priority tokens
      }),
    });

    if (!response.ok) {
      console.warn('[Token Metadata] Failed to preload token images:', response.status);
      return;
    }

    const data = await response.json();
    console.log(`[Token Metadata] Received bulk images response:`, data);

    // Update memory cache with all received images
    Object.entries(data.images).forEach(([symbol, imageUrl]) => {
      if (imageUrl) {
        imageCache.set(symbol, imageUrl as string);
      }
    });
  } catch (error) {
    console.error('[Token Metadata] Error preloading token images:', error);
  }
}

// Clear memory cache periodically (every hour)
setInterval(() => {
  imageCache.clear();
  hasPreloaded = false;
}, 3600000);

interface TokenMetadata {
  name: string;
  symbol: string;
  uri: string;
  image?: string;
}

export async function enrichTokenMetadata(mintAddress: string): Promise<TokenMetadata | null> {
  if (!mintAddress) {
    console.warn('[Token Metadata] No mint address provided');
    return null;
  }

  try {
    const metadata: TokenMetadata = {
      name: "Token Name",
      symbol: "SYMBOL",
      uri: "",
    };

    metadata.image = await getTokenImage(metadata.symbol);
    return metadata;
  } catch (error) {
    console.error('[Token Metadata] Error enriching token metadata:', error);
    return null;
  }
}

export function getImageUrl(uri?: string): string {
  if (!uri) return '/placeholder.png';
  return uri;
}
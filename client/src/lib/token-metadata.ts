import { useUnifiedTokenStore } from './unified-token-store';

// Cache for successful image loads
const imageCache = new Map<string, string>();
let hasPreloaded = false;

/**
 * Get image URL for a single token
 * Uses database-backed system with memory cache
 */
export async function getTokenImage(symbol: string): Promise<string> {
  if (!symbol) {
    console.warn('[Token Metadata] No symbol provided');
    return '';
  }

  // Normalize symbol
  const normalizedSymbol = symbol.toUpperCase();

  // Check memory cache first
  if (imageCache.has(normalizedSymbol)) {
    console.log(`[Token Metadata] Cache hit for ${normalizedSymbol}`);
    return imageCache.get(normalizedSymbol)!;
  }

  try {
    // Try to preload all images if not done yet
    if (!hasPreloaded) {
      await preloadStoredImages();

      // Check cache again after preload
      if (imageCache.has(normalizedSymbol)) {
        console.log(`[Token Metadata] Found ${normalizedSymbol} after preload`);
        return imageCache.get(normalizedSymbol)!;
      }
    }

    const response = await fetch(`/api/token-image/${encodeURIComponent(normalizedSymbol)}`);
    if (!response.ok) {
      console.warn(`[Token Metadata] Error fetching image for ${normalizedSymbol}: ${response.status}`);
      return '';
    }

    const data = await response.json();
    console.log(`[Token Metadata] API response for ${normalizedSymbol}:`, data);

    if (data.imageUrl) {
      // Update memory cache
      imageCache.set(normalizedSymbol, data.imageUrl);
      return data.imageUrl;
    }

    return '';
  } catch (error) {
    console.error(`[Token Metadata] Failed to fetch image for ${normalizedSymbol}:`, error);
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
      if (imageUrl && typeof imageUrl === 'string') {
        imageCache.set(symbol.toUpperCase(), imageUrl);
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
  if (!symbols.length) return;

  const normalizedSymbols = symbols.map(s => s.toUpperCase());
  console.log(`[Token Metadata] Preloading images for ${normalizedSymbols.length} tokens`);

  try {
    const response = await fetch('/api/token-images/bulk', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        symbols: normalizedSymbols,
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
      if (imageUrl && typeof imageUrl === 'string') {
        imageCache.set(symbol.toUpperCase(), imageUrl);
      }
    });
  } catch (error) {
    console.error('[Token Metadata] Error preloading token images:', error);
  }
}

// Clear memory cache periodically (every 30 minutes)
setInterval(() => {
  console.log('[Token Metadata] Clearing image cache');
  imageCache.clear();
  hasPreloaded = false;
}, 1800000);

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
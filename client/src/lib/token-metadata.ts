import { useUnifiedTokenStore } from './unified-token-store';

// Cache for successful image loads
const imageCache = new Map<string, string>();

/**
 * Get image URL for a single token
 * Uses database-backed system with memory cache
 */
export async function getTokenImage(symbol: string): Promise<string> {
  // Check memory cache first
  if (imageCache.has(symbol)) {
    return imageCache.get(symbol)!;
  }

  try {
    const response = await fetch(`/api/token-image/${encodeURIComponent(symbol)}`);
    if (!response.ok) {
      console.warn(`Error fetching image for ${symbol}:`, response.status);
      return '';
    }

    const data = await response.json();
    if (data.imageUrl) {
      // Update memory cache
      imageCache.set(symbol, data.imageUrl);
      return data.imageUrl;
    }

    return '';
  } catch (error) {
    console.error(`Failed to fetch image for ${symbol}:`, error);
    return '';
  }
}

/**
 * Preload images for a list of tokens
 * Uses bulk endpoint to efficiently load multiple images and set priorities
 */
export async function preloadTokenImages(symbols: string[]): Promise<void> {
  try {
    const response = await fetch('/api/token-images/bulk', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        symbols,
        priority: true // Signal these are priority tokens (visible to user)
      }),
    });

    if (!response.ok) {
      console.warn('Failed to preload token images:', response.status);
      return;
    }

    const data = await response.json();

    // Update memory cache with all received images
    Object.entries(data.images).forEach(([symbol, imageUrl]) => {
      if (imageUrl) {
        imageCache.set(symbol, imageUrl as string);
      }
    });
  } catch (error) {
    console.error('Error preloading token images:', error);
  }
}

// Clear memory cache periodically (every hour)
setInterval(() => {
  imageCache.clear();
}, 3600000);

interface TokenMetadata {
  name: string;
  symbol: string;
  uri: string;
  image?: string;
}

const metadataCache = new Map<string, TokenMetadata>();

export async function enrichTokenMetadata(mintAddress: string): Promise<TokenMetadata | null> {
  if (metadataCache.has(mintAddress)) {
    return metadataCache.get(mintAddress)!;
  }

  try {
    const metadata: TokenMetadata = {
      name: "Token Name",
      symbol: "SYMBOL",
      uri: "",
    };

    // Try to get the image using our new database-backed system
    metadata.image = await getTokenImage(metadata.symbol);

    // Cache the result
    metadataCache.set(mintAddress, metadata);
    return metadata;
  } catch (error) {
    console.error('[Token Metadata] Error fetching token metadata:', error);
    return null;
  }
}

export function getImageUrl(uri?: string): string {
  if (!uri) return '/fallback.png';
  return uri;
}
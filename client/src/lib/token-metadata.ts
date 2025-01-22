import { useUnifiedTokenStore } from './unified-token-store';

// Cache for successful image loads
const imageCache = new Map<string, string>();
const metadataCache = new Map<string, TokenMetadata>();
let hasPreloaded = false;

interface TokenMetadata {
  name: string;
  symbol: string;
  description?: string;
  image?: string;
  externalUrl?: string;
  socialLinks?: {
    twitter?: string;
    telegram?: string;
    discord?: string;
  };
}

/**
 * Transform IPFS URI to HTTP URL
 */
function transformUri(uri: string): string {
  if (!uri) return '';

  // Handle IPFS URIs
  if (uri.startsWith('ipfs://')) {
    return uri.replace('ipfs://', 'https://ipfs.io/ipfs/');
  }

  // Handle direct IPFS paths
  if (uri.startsWith('Qm') || uri.startsWith('bafy')) {
    return `https://ipfs.io/ipfs/${uri}`;
  }

  return uri;
}

/**
 * Fetch metadata for a token from its URI
 */
async function fetchTokenMetadata(uri: string): Promise<TokenMetadata | null> {
  if (!uri) {
    console.warn('[Token Metadata] No URI provided');
    return null;
  }

  try {
    const url = transformUri(uri);
    console.log(`[Token Metadata] Fetching from ${url}`);

    const response = await fetch(url);
    if (!response.ok) {
      console.warn(`[Token Metadata] Error fetching metadata: ${response.status}`);
      return null;
    }

    const data = await response.json();
    console.log(`[Token Metadata] Received metadata:`, data);

    // Parse and normalize metadata
    const metadata: TokenMetadata = {
      name: data.name || '',
      symbol: data.symbol || '',
      description: data.description,
      image: transformUri(data.image),
      externalUrl: data.external_url || data.website,
      socialLinks: {
        twitter: data.twitter_url || data.twitter,
        telegram: data.telegram_url || data.telegram,
        discord: data.discord_url || data.discord
      }
    };

    // Cache the result
    metadataCache.set(uri, metadata);
    if (metadata.image) {
      imageCache.set(metadata.symbol, metadata.image);
    }

    return metadata;
  } catch (error) {
    console.error(`[Token Metadata] Failed to fetch metadata:`, error);
    return null;
  }
}

/**
 * Get metadata for a token by its URI
 * Uses cache if available
 */
export async function getTokenMetadata(uri: string): Promise<TokenMetadata | null> {
  if (!uri) {
    console.warn('[Token Metadata] No URI provided');
    return null;
  }

  // Check cache first
  if (metadataCache.has(uri)) {
    return metadataCache.get(uri)!;
  }

  return await fetchTokenMetadata(uri);
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

// Clear caches periodically (every 30 minutes)
setInterval(() => {
  console.log('[Token Metadata] Clearing metadata and image caches');
  metadataCache.clear();
  imageCache.clear();
  hasPreloaded = false;
}, 1800000);


export async function enrichTokenMetadata(mintAddress: string): Promise<TokenMetadata | null> {
  if (!mintAddress) {
    console.warn('[Token Metadata] No mint address provided');
    return null;
  }

  try {
    //  This section needs to be significantly altered to fetch metadata using the new functions.  The original implementation is insufficient.  Assuming an API endpoint exists to get the URI from mintAddress.
    const response = await fetch(`/api/token-uri/${encodeURIComponent(mintAddress)}`);
    if (!response.ok) {
      console.warn(`[Token Metadata] Error fetching URI for ${mintAddress}: ${response.status}`);
      return null;
    }
    const { uri } = await response.json();

    return await getTokenMetadata(uri);

  } catch (error) {
    console.error('[Token Metadata] Error enriching token metadata:', error);
    return null;
  }
}

export function getImageUrl(uri?: string): string {
  if (!uri) return '/placeholder.png';
  return transformUri(uri);
}
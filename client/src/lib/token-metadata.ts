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
export function transformUri(uri: string): string {
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

// Clear caches periodically (every 30 minutes)
setInterval(() => {
  console.log('[Token Metadata] Clearing metadata and image caches');
  metadataCache.clear();
  imageCache.clear();
  hasPreloaded = false;
}, 1800000);

export function getImageUrl(uri?: string): string {
  if (!uri) return '/placeholder.png';
  return transformUri(uri);
}
// FILE: /src/lib/token-metadata.ts

interface TokenMetadata {
  name: string;
  symbol: string;
  description?: string;
  image: string;
  showName?: boolean;
  createdOn?: string;
}

/**
 * Transform IPFS URI to HTTP URL
 * Converts IPFS URIs to a gateway URL.
 * @param uri - The IPFS URI to transform.
 * @returns The transformed HTTP URL.
 */
export function transformUri(uri: string): string {
  if (!uri) return '';

  try {
    // Handle IPFS URIs
    if (uri.startsWith('ipfs://')) {
      return uri.replace('ipfs://', 'https://ipfs.io/ipfs/');
    }

    // Handle direct IPFS CIDs (both v0 and v1)
    if (uri.startsWith('Qm') || uri.startsWith('bafy')) {
      return `https://ipfs.io/ipfs/${uri}`;
    }

    // Handle full IPFS gateway URLs
    if (uri.includes('/ipfs/')) {
      return uri;
    }

    // Try to parse as JSON if it looks like a JSON string
    if (uri.startsWith('{') && uri.endsWith('}')) {
      try {
        const metadata = JSON.parse(uri) as TokenMetadata;
        if (metadata.image) {
          return transformUri(metadata.image);
        }
      } catch (e) {
        console.warn('[Token Metadata] Failed to parse JSON metadata:', e);
      }
    }

    return uri;
  } catch (error) {
    console.error('[Token Metadata] Error transforming URI:', error);
    return '';
  }
}

/**
 * Get image URL from token URI, with fallback
 * Provides a fallback image if the URI is missing.
 * @param uri - The token URI.
 * @returns The image URL or a placeholder.
 */
export function getImageUrl(uri?: string): string {
  if (!uri) {
    console.warn('[Token Metadata] No URI provided, using placeholder');
    return 'https://via.placeholder.com/150?text=No+Image';
  }

  try {
    const transformedUrl = transformUri(uri);
    if (!transformedUrl) {
      console.warn('[Token Metadata] Failed to transform URI:', uri);
      return 'https://via.placeholder.com/150?text=Invalid+URI';
    }

    // Validate URL format
    try {
      new URL(transformedUrl);
      return transformedUrl;
    } catch {
      console.warn('[Token Metadata] Invalid URL format:', transformedUrl);
      return 'https://via.placeholder.com/150?text=Invalid+URL';
    }
  } catch (error) {
    console.error('[Token Metadata] Error getting image URL:', error);
    return 'https://via.placeholder.com/150?text=Error';
  }
}

/**
 * Get token image URL
 * @param token - The token object containing imageLink and symbol.
 * @returns The image URL or a placeholder.
 */
export function getTokenImage(token: { imageLink?: string; symbol: string }): string {
  if (!token) return 'https://via.placeholder.com/150?text=No+Token';

  try {
    // Try to get image from imageLink
    const imageUrl = getImageUrl(token.imageLink);
    console.log('[Token Metadata] Resolved image URL for', token.symbol, ':', imageUrl);
    return imageUrl;
  } catch (error) {
    console.error('[Token Metadata] Error getting token image:', error);
    return `https://via.placeholder.com/150?text=${encodeURIComponent(token.symbol)}`;
  }
}

/**
 * Parse token metadata from JSON
 * @param jsonString - The JSON metadata string
 * @returns Parsed token metadata or null if invalid
 */
export function parseTokenMetadata(jsonString: string): TokenMetadata | null {
  try {
    const metadata = JSON.parse(jsonString) as TokenMetadata;
    if (metadata.name && metadata.symbol && metadata.image) {
      return metadata;
    }
    console.warn('[Token Metadata] Invalid metadata format:', metadata);
    return null;
  } catch (error) {
    console.error('[Token Metadata] Failed to parse metadata:', error);
    return null;
  }
}

/**
 * Preload images for a list of tokens
 * Preloads token images to improve performance.
 * @param tokens - Array of tokens with image links and symbols.
 */
export function preloadTokenImages(tokens: { imageLink?: string; symbol: string }[]): void {
  if (!tokens || tokens.length === 0) {
    console.warn('[Token Metadata] No tokens provided for preloading images.');
    return;
  }

  // Extract symbols ensuring they are strings
  const symbols = tokens.map(token => token.symbol).filter(s => typeof s === 'string');
  if (!symbols.length) return;

  // Normalize symbols to uppercase
  const normalizedSymbols = symbols.map(s => s.toUpperCase());
  console.log(`[Token Metadata] Preloading images for ${normalizedSymbols.length} tokens`);

  // Preload images with better error handling
  tokens.forEach(token => {
    if (token.imageLink) {
      const imageUrl = getTokenImage(token);
      const img = new Image();

      img.onload = () => {
        console.log(`[Token Metadata] Successfully preloaded image for token: ${token.symbol}`);
      };

      img.onerror = (error) => {
        console.error(`[Token Metadata] Failed to load image for token: ${token.symbol}`, error);
      };

      // Set crossOrigin to handle CORS issues
      img.crossOrigin = "anonymous";
      img.src = imageUrl;
    } else {
      console.warn(`[Token Metadata] No image link provided for token: ${token.symbol}`);
    }
  });
}
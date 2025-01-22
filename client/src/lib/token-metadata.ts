// FILE: /src/lib/token-metadata.ts

/**
 * Transform IPFS URI to HTTP URL
 * Converts IPFS URIs to a gateway URL.
 * @param uri - The IPFS URI to transform.
 * @returns The transformed HTTP URL.
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
 * Get image URL from token URI, with fallback
 * Provides a fallback image if the URI is missing.
 * @param uri - The token URI.
 * @returns The image URL or a placeholder.
 */
export function getImageUrl(uri?: string): string {
  if (!uri) return 'https://via.placeholder.com/150'; // Assign a default placeholder
  return transformUri(uri);
}

/**
 * Get token image URL
 * @param token - The token object containing imageLink and symbol.
 * @returns The image URL or a placeholder.
 */
export function getTokenImage(token: { imageLink?: string; symbol: string }): string {
  return getImageUrl(token.imageLink);
}

/**
 * Preload images for a list of tokens
 * Preloads token images to improve performance.
 * @param tokens - Array of tokens with image links and symbols.
 */
export function preloadTokenImages(tokens: { imageLink?: string; symbol: string }[]): void {
  if (!tokens || tokens.length === 0) {
    console.warn('No tokens provided for preloading images.');
    return;
  }

  // Extract symbols ensuring they are strings
  const symbols = tokens.map(token => token.symbol).filter(s => typeof s === 'string');
  if (!symbols.length) return;

  // Normalize symbols to uppercase
  const normalizedSymbols = symbols.map(s => s.toUpperCase());
  console.log(`[Token Metadata] Preloading images for ${normalizedSymbols.length} tokens`);

  // Preload images
  tokens.forEach(token => {
    if (token.imageLink) {
      const img = new Image();
      img.src = getImageUrl(token.imageLink);
      img.onload = () => {
        console.log(`Image preloaded for token: ${token.symbol}`);
      };
      img.onerror = () => {
        console.error(`Failed to load image for token: ${token.symbol}`);
      };
    } else {
      console.warn(`No image link provided for token: ${token.symbol}`);
    }
  });
}

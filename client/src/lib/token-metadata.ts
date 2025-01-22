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
 * Fetch and parse token metadata from IPFS
 * Retrieves the metadata JSON and extracts the image URL.
 * @param metadataUri - The IPFS URI pointing to the metadata JSON.
 * @returns The image URL or undefined if not found.
 */
export async function fetchTokenMetadata(metadataUri: string): Promise<string | undefined> {
  const httpUrl = transformUri(metadataUri);
  try {
    const response = await fetch(httpUrl);
    const metadata = await response.json();
    if (metadata && metadata.image) {
      return transformUri(metadata.image);
    }
  } catch (error) {
    console.error(`Failed to fetch or parse metadata from ${httpUrl}:`, error);
  }
  return undefined;
}

/**
 * Get image URL from token URI or metadata
 * Provides the actual image URL by fetching metadata if necessary.
 * @param token - The token object containing imageLink and symbol.
 * @returns The image URL or a placeholder.
 */
export async function getTokenImage(token: { imageLink?: string; symbol: string }): Promise<string> {
  if (!token.imageLink) {
    return 'https://via.placeholder.com/150'; // Default placeholder
  }

  // Check if imageLink points to a metadata JSON
  if (token.imageLink.endsWith('.json') || token.imageLink.includes('/ipfs/')) {
    const imageUrl = await fetchTokenMetadata(token.imageLink);
    if (imageUrl) {
      return imageUrl;
    }
  }

  // If imageLink is a direct image URL
  return transformUri(token.imageLink);
}

/**
 * Preload images for a list of tokens
 * Preloads token images to improve performance.
 * @param tokens - Array of tokens with image links and symbols.
 */
export async function preloadTokenImages(tokens: { imageLink?: string; symbol: string }[]): Promise<void> {
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
  for (const token of tokens) {
    if (token.imageLink) {
      const img = new Image();
      const imageUrl = await getTokenImage(token);
      img.src = imageUrl;
      img.onload = () => {
        console.log(`Image preloaded for token: ${token.symbol}`);
      };
      img.onerror = () => {
        console.error(`Failed to load image for token: ${token.symbol}`);
      };
    } else {
      console.warn(`No image link provided for token: ${token.symbol}`);
    }
  }
}

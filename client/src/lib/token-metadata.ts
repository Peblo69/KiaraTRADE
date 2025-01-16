import { pumpPortalSocket, usePumpPortalStore } from './pump-portal-websocket';

interface TokenMetadata {
  name: string;
  symbol: string;
  uri: string;
  image?: string;
  description?: string;
}

// Cache metadata responses to avoid redundant API calls
const metadataCache = new Map<string, TokenMetadata>();

export async function enrichTokenMetadata(mintAddress: string): Promise<TokenMetadata | null> {
  // Check cache first
  if (metadataCache.has(mintAddress)) {
    return metadataCache.get(mintAddress)!;
  }

  try {
    // Fetch metadata using Helius API
    const response = await fetch('https://ramona-1jvbj3-fast-mainnet.helius-rpc.com', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 'metadata-fetch',
        method: 'getTokenMetadata',
        params: [mintAddress],
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch metadata: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('Received metadata response:', data); // Debug log

    if (!data.result) {
      throw new Error('No metadata found');
    }

    const metadata: TokenMetadata = {
      name: data.result.name || 'Unknown Token',
      symbol: data.result.symbol || 'UNKNOWN',
      uri: data.result.uri || '',
    };

    // If we have a URI, try to fetch the actual image URL with retries
    if (metadata.uri) {
      let attempts = 0;
      const maxAttempts = 3;

      while (attempts < maxAttempts) {
        try {
          console.log(`Attempting to fetch URI data (attempt ${attempts + 1}):`, metadata.uri);
          const uriResponse = await fetch(metadata.uri);

          if (!uriResponse.ok) {
            throw new Error(`Failed to fetch URI data: ${uriResponse.statusText}`);
          }

          const uriData = await uriResponse.json();
          console.log('Received URI data:', uriData); // Debug log

          // Try different possible image fields in order of preference
          metadata.image = 
            uriData.image_url || // Try official image URL first
            uriData.image || // Then standard image field
            uriData.imageUrl || // Then alternate casing
            uriData.uri || // Then fall back to URI
            metadata.uri; // Finally use original URI

          if (metadata.image) {
            console.log('Found image URL:', metadata.image);
            break; // Successfully found an image URL
          }

          metadata.description = uriData.description;
          break;
        } catch (error) {
          console.error(`Attempt ${attempts + 1} failed:`, error);
          attempts++;
          if (attempts === maxAttempts) {
            console.error('All attempts to fetch URI data failed');
            metadata.image = metadata.uri; // Use URI as fallback
          }
          await new Promise(resolve => setTimeout(resolve, 1000 * attempts)); // Exponential backoff
        }
      }
    }

    // Cache the result
    metadataCache.set(mintAddress, metadata);

    // Update the token in the store with enriched data
    const imageUrl = getImageUrl(metadata.image || metadata.uri);
    console.log('Final image URL:', imageUrl); // Debug log

    usePumpPortalStore.getState().updateToken(mintAddress, {
      name: metadata.name,
      symbol: metadata.symbol,
      imageUrl,
    });

    return metadata;
  } catch (error) {
    console.error('Error fetching token metadata:', error);
    return null;
  }
}

export function getImageUrl(uri?: string, fallback = 'https://cryptologos.cc/logos/solana-sol-logo.png'): string {
  if (!uri) return fallback;

  try {
    // Handle IPFS URLs
    if (uri.startsWith('ipfs://')) {
      return uri.replace('ipfs://', 'https://ipfs.io/ipfs/');
    }

    // Handle Arweave URLs
    if (uri.startsWith('ar://')) {
      return uri.replace('ar://', 'https://arweave.net/');
    }

    // Handle HTTP URLs
    if (uri.startsWith('http://')) {
      return uri.replace('http://', 'https://');
    }

    // Handle base64 encoded images
    if (uri.startsWith('data:image')) {
      return uri;
    }

    // If it's already a valid HTTPS URL, return it
    if (uri.startsWith('https://')) {
      return uri;
    }

    // If it looks like an IPFS hash without protocol
    if (/^Qm[1-9A-Za-z]{44}/.test(uri)) {
      return `https://ipfs.io/ipfs/${uri}`;
    }

    // If it's an Arweave hash without protocol
    if (/^[a-zA-Z0-9_-]{43}$/.test(uri)) {
      return `https://arweave.net/${uri}`;
    }

    // If all else fails, try to make it a valid URL
    try {
      new URL(uri);
      return uri;
    } catch {
      return `https://${uri}`;
    }
  } catch (error) {
    console.error('Error processing image URL:', error);
    return fallback;
  }
}
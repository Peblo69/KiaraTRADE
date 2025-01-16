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

    if (!data.result) {
      throw new Error('No metadata found');
    }

    const metadata: TokenMetadata = {
      name: data.result.name || 'Unknown Token',
      symbol: data.result.symbol || 'UNKNOWN',
      uri: data.result.uri || '',
    };

    // If we have a URI, try to fetch the actual image URL
    if (metadata.uri) {
      try {
        const uriResponse = await fetch(metadata.uri);
        if (!uriResponse.ok) {
          throw new Error(`Failed to fetch URI data: ${uriResponse.statusText}`);
        }

        const uriData = await uriResponse.json();

        // Try different possible image fields
        metadata.image = uriData.image || 
                        uriData.image_url || 
                        uriData.imageUrl || 
                        uriData.uri ||
                        metadata.uri;

        metadata.description = uriData.description;

        console.log('Enriched metadata for token:', mintAddress, metadata);
      } catch (error) {
        console.error('Failed to fetch token URI data:', error);
        // Keep the original URI if the extended fetch fails
        metadata.image = metadata.uri;
      }
    }

    // Cache the result
    metadataCache.set(mintAddress, metadata);

    // Update the token in the store with enriched data
    usePumpPortalStore.getState().updateToken(mintAddress, {
      name: metadata.name,
      symbol: metadata.symbol,
      imageUrl: getImageUrl(metadata.image || metadata.uri),
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
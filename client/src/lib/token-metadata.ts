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
        const uriData = await uriResponse.json();
        
        metadata.image = uriData.image || uriData.uri || metadata.uri;
        metadata.description = uriData.description;
      } catch (error) {
        console.error('Failed to fetch token URI data:', error);
        // Keep the original URI if the extended fetch fails
      }
    }

    // Cache the result
    metadataCache.set(mintAddress, metadata);
    
    // Update the token in the store with enriched data
    usePumpPortalStore.getState().updateToken(mintAddress, {
      name: metadata.name,
      symbol: metadata.symbol,
      imageUrl: metadata.image || metadata.uri,
    });

    return metadata;
  } catch (error) {
    console.error('Error fetching token metadata:', error);
    return null;
  }
}

export function getImageUrl(uri?: string, fallback = 'https://cryptologos.cc/logos/solana-sol-logo.png'): string {
  if (!uri) return fallback;

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

  return uri || fallback;
}

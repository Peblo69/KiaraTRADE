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
    // Fetch metadata using Helius API with retries
    let attempts = 0;
    const maxAttempts = 3;
    let data;

    while (attempts < maxAttempts) {
      try {
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

        data = await response.json();
        console.log('[Token Metadata] Received metadata response:', data);
        break;
      } catch (error) {
        attempts++;
        console.error(`[Token Metadata] Attempt ${attempts} failed:`, error);
        if (attempts === maxAttempts) throw error;
        await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
      }
    }

    if (!data?.result) {
      throw new Error('No metadata found');
    }

    const metadata: TokenMetadata = {
      name: data.result.name || 'Unknown Token',
      symbol: data.result.symbol || 'UNKNOWN',
      uri: data.result.uri || '',
    };

    // If we have a URI, try to fetch the actual image URL
    if (metadata.uri) {
      attempts = 0;
      while (attempts < maxAttempts) {
        try {
          console.log(`[Token Metadata] Attempting to fetch URI data (attempt ${attempts + 1}):`, metadata.uri);
          const uriResponse = await fetch(metadata.uri);

          if (!uriResponse.ok) {
            throw new Error(`Failed to fetch URI data: ${uriResponse.statusText}`);
          }

          const uriData = await uriResponse.json();
          console.log('[Token Metadata] Received URI data:', uriData);

          // Try different possible image fields in order of preference
          const possibleImageFields = [
            uriData.image_url,
            uriData.image,
            uriData.imageUrl,
            uriData.uri,
            uriData.animation_url,
            metadata.uri
          ];

          // Find the first valid image URL
          for (const imageUrl of possibleImageFields) {
            if (imageUrl && typeof imageUrl === 'string') {
              try {
                const imgResponse = await fetch(getImageUrl(imageUrl));
                if (imgResponse.ok && imgResponse.headers.get('content-type')?.startsWith('image/')) {
                  metadata.image = imageUrl;
                  console.log('[Token Metadata] Valid image URL found:', imageUrl);
                  break;
                }
              } catch (error) {
                console.warn('[Token Metadata] Failed to validate image URL:', imageUrl, error);
                continue;
              }
            }
          }

          if (!metadata.image) {
            console.warn('[Token Metadata] No valid image URL found, using fallback');
            metadata.image = 'https://cryptologos.cc/logos/solana-sol-logo.png';
          }

          metadata.description = uriData.description;
          break;
        } catch (error) {
          attempts++;
          console.error(`[Token Metadata] URI fetch attempt ${attempts} failed:`, error);
          if (attempts === maxAttempts) {
            console.error('[Token Metadata] All attempts to fetch URI data failed');
            metadata.image = 'https://cryptologos.cc/logos/solana-sol-logo.png';
          }
          await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
        }
      }
    }

    // Cache the result
    metadataCache.set(mintAddress, metadata);

    // Update the token in the store with enriched data
    const imageUrl = getImageUrl(metadata.image || metadata.uri);
    console.log('[Token Metadata] Final image URL:', imageUrl);

    usePumpPortalStore.getState().updateToken(mintAddress, {
      name: metadata.name,
      symbol: metadata.symbol,
      imageUrl,
    });

    return metadata;
  } catch (error) {
    console.error('[Token Metadata] Error fetching token metadata:', error);
    return null;
  }
}

export function getImageUrl(uri?: string, fallback = 'https://cryptologos.cc/logos/solana-sol-logo.png'): string {
  if (!uri) return fallback;

  try {
    // Handle IPFS URLs
    if (uri.startsWith('ipfs://')) {
      return uri.replace('ipfs://', 'https://cloudflare-ipfs.com/ipfs/');
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
      // Special case for raw IPFS gateway URLs
      if (uri.includes('ipfs.io')) {
        return uri.replace('ipfs.io', 'cloudflare-ipfs.com');
      }
      return uri;
    }

    // If it looks like an IPFS hash without protocol
    if (/^Qm[1-9A-Za-z]{44}/.test(uri)) {
      return `https://cloudflare-ipfs.com/ipfs/${uri}`;
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
    console.error('[Token Metadata] Error processing image URL:', error);
    return fallback;
  }
}
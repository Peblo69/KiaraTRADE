import { useUnifiedTokenStore } from './unified-token-store';

// Cache for successful image loads
const imageCache = new Map<string, string>();

// Function to convert KuCoin symbol to CoinGecko ID
function convertToCoinGeckoId(symbol: string): string {
  return symbol.replace('-USDT', '').toLowerCase();
}

export async function getTokenImage(symbol: string): Promise<string> {
  const cleanSymbol = convertToCoinGeckoId(symbol);

  // Check memory cache first
  if (imageCache.has(cleanSymbol)) {
    return imageCache.get(cleanSymbol)!;
  }

  // Try to load from localStorage
  const storedImage = localStorage.getItem(`crypto-icon-${cleanSymbol}`);
  if (storedImage) {
    imageCache.set(cleanSymbol, storedImage);
    return storedImage;
  }

  try {
    // Fetch from CoinGecko markets endpoint
    const response = await fetch(
      `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${cleanSymbol}&per_page=1`
    );

    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`);
    }

    const data = await response.json();

    if (data && data[0] && data[0].image) {
      const imageUrl = data[0].image;
      // Store in both memory cache and localStorage
      imageCache.set(cleanSymbol, imageUrl);
      localStorage.setItem(`crypto-icon-${cleanSymbol}`, imageUrl);
      return imageUrl;
    }
  } catch (error) {
    console.error(`Failed to fetch image for ${symbol}:`, error);
  }

  // Return empty string to trigger fallback icon generation
  return '';
}

// Keep the existing TokenMetadata interface and other utility functions
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

    // Try to get the image using CoinGecko
    metadata.image = await getTokenImage(metadata.symbol);
    if (!metadata.image) {
      console.warn('[Token Metadata] No valid image URL found, using fallback');
      metadata.image = '/fallback.png';
    }

    // Cache the result
    metadataCache.set(mintAddress, metadata);

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
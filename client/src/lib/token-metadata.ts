import { useUnifiedTokenStore } from './unified-token-store';

// Cache for successful image loads
const imageCache = new Map<string, string>();

// Function to convert KuCoin symbol to CoinGecko ID
function convertToCoinGeckoId(symbol: string): string {
  // Handle common symbol mappings
  const symbolMappings: Record<string, string> = {
    'BTC-USDT': 'bitcoin',
    'ETH-USDT': 'ethereum',
    'SOL-USDT': 'solana',
    'DOGE-USDT': 'dogecoin',
    'XRP-USDT': 'ripple',
    'ADA-USDT': 'cardano',
    'DOT-USDT': 'polkadot',
    'LINK-USDT': 'chainlink',
    'UNI-USDT': 'uniswap',
    'MATIC-USDT': 'matic-network',
    'AVAX-USDT': 'avalanche-2',
    'FTM-USDT': 'fantom',
    'ATOM-USDT': 'cosmos',
    'NEAR-USDT': 'near',
    'ALGO-USDT': 'algorand',
    'VET-USDT': 'vechain',
    'SAND-USDT': 'the-sandbox',
    'MANA-USDT': 'decentraland',
    'AXS-USDT': 'axie-infinity',
    'SHIB-USDT': 'shiba-inu',
  };

  // Check if we have a direct mapping
  if (symbolMappings[symbol]) {
    return symbolMappings[symbol];
  }

  // Otherwise, clean the symbol and return
  return symbol.replace('-USDT', '').toLowerCase();
}

/**
 * Fetches token image URL from CoinGecko
 * Returns empty string if image cannot be fetched, triggering fallback
 */
export async function getTokenImage(symbol: string): Promise<string> {
  const cleanSymbol = convertToCoinGeckoId(symbol);

  // Check memory cache first
  if (imageCache.has(cleanSymbol)) {
    return imageCache.get(cleanSymbol)!;
  }

  try {
    // Fetch from CoinGecko markets endpoint (simpler than /coins/{id})
    const response = await fetch(
      `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${cleanSymbol}&per_page=1`
    );

    if (!response.ok) {
      console.warn(`CoinGecko API error for ${symbol}:`, response.status);
      return '';
    }

    const data = await response.json();

    if (data && data[0] && data[0].image) {
      const imageUrl = data[0].image;
      // Store in memory cache
      imageCache.set(cleanSymbol, imageUrl);
      return imageUrl;
    }

    console.warn(`No image found for ${symbol} in CoinGecko response`);
    return '';
  } catch (error) {
    console.error(`Failed to fetch image for ${symbol}:`, error);
    return '';
  }
}

// Simple interface for token metadata
interface TokenMetadata {
  name: string;
  symbol: string;
  uri: string;
  image?: string;
}

const metadataCache = new Map<string, TokenMetadata>();

export async function enrichTokenMetadata(mintAddress: string): Promise<TokenMetadata | null> {
  if (metadataCache.has(mintAddress)) {
    return metadataCache.get(mintAddress)!;
  }

  try {
    const metadata: TokenMetadata = {
      name: "Token Name",
      symbol: "SYMBOL",
      uri: "",
    };

    // Try to get the image using CoinGecko
    metadata.image = await getTokenImage(metadata.symbol);

    // Cache the result
    metadataCache.set(mintAddress, metadata);
    return metadata;
  } catch (error) {
    console.error('[Token Metadata] Error fetching token metadata:', error);
    return null;
  }
}

export function getImageUrl(uri?: string): string {
  if (!uri) return '/fallback.png';
  return uri;
}
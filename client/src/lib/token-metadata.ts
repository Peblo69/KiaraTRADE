import { useUnifiedTokenStore } from './unified-token-store';

// Cache for successful image loads
const imageCache = new Map<string, string>();

// Function to convert KuCoin symbol to CoinGecko ID
function convertToCoinGeckoId(symbol: string): string {
  // Comprehensive symbol mappings for major tokens
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
    'LTC-USDT': 'litecoin',
    'BCH-USDT': 'bitcoin-cash',
    'ETC-USDT': 'ethereum-classic',
    'FIL-USDT': 'filecoin',
    'AAVE-USDT': 'aave',
    'THETA-USDT': 'theta-token',
    'XLM-USDT': 'stellar',
    'ICP-USDT': 'internet-computer',
    'TRX-USDT': 'tron',
    'EOS-USDT': 'eos',
    'XTZ-USDT': 'tezos',
    'CAKE-USDT': 'pancakeswap-token',
    'NEO-USDT': 'neo',
    'KSM-USDT': 'kusama',
    'WAVES-USDT': 'waves',
    'MKR-USDT': 'maker',
    'SNX-USDT': 'havven',
    'COMP-USDT': 'compound-governance-token',
    'DASH-USDT': 'dash',
    'HT-USDT': 'huobi-token',
    'CHZ-USDT': 'chiliz',
    'XEM-USDT': 'nem',
    'HOT-USDT': 'holotoken',
    'BAT-USDT': 'basic-attention-token',
    'ZIL-USDT': 'zilliqa',
    'ENJ-USDT': 'enjincoin',
    'ZEC-USDT': 'zcash',
    'IOTA-USDT': 'iota',
    'DGB-USDT': 'digibyte',
    '1INCH-USDT': '1inch',
    'BTT-USDT': 'bittorrent',
    'QTUM-USDT': 'qtum',
    'ONT-USDT': 'ontology',
    'ICX-USDT': 'icon',
    'OMG-USDT': 'omisego',
  };

  // Check if we have a direct mapping
  if (symbolMappings[symbol]) {
    return symbolMappings[symbol];
  }

  // Otherwise, clean the symbol and return
  return symbol.replace('-USDT', '').toLowerCase();
}

/**
 * Bulk fetch images for multiple tokens at once
 * This helps avoid rate limits and is more efficient
 */
async function bulkFetchTokenImages(symbols: string[]): Promise<void> {
  // Convert all symbols to CoinGecko IDs
  const ids = symbols.map(convertToCoinGeckoId);

  // Remove any IDs we already have cached
  const uncachedIds = ids.filter(id => !imageCache.has(id));

  if (uncachedIds.length === 0) return;

  try {
    // Fetch in batches of 50 to avoid URL length limits
    const batchSize = 50;
    for (let i = 0; i < uncachedIds.length; i += batchSize) {
      const batch = uncachedIds.slice(i, i + batchSize);

      const response = await fetch(
        `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${batch.join(',')}&per_page=${batchSize}&sparkline=false`
      );

      if (!response.ok) {
        if (response.status === 429) {
          // Rate limit hit - wait 60 seconds before retrying
          await new Promise(resolve => setTimeout(resolve, 61000));
          i -= batchSize; // Retry this batch
          continue;
        }
        console.warn(`CoinGecko API error: ${response.status}`);
        continue;
      }

      const data = await response.json();

      // Cache all images from this batch
      for (const coin of data) {
        if (coin.id && coin.image) {
          imageCache.set(coin.id, coin.image);
        }
      }

      // Small delay between batches to be nice to the API
      if (i + batchSize < uncachedIds.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  } catch (error) {
    console.error('Error in bulk image fetch:', error);
  }
}

/**
 * Get image URL for a single token
 * Will trigger bulk fetch if image isn't cached
 */
export async function getTokenImage(symbol: string): Promise<string> {
  const id = convertToCoinGeckoId(symbol);

  // Check cache first
  if (imageCache.has(id)) {
    return imageCache.get(id)!;
  }

  // If not in cache, do a bulk fetch
  await bulkFetchTokenImages([symbol]);

  return imageCache.get(id) || '';
}

/**
 * Preload images for a list of tokens
 * Call this when displaying a list of tokens
 */
export async function preloadTokenImages(symbols: string[]): Promise<void> {
  await bulkFetchTokenImages(symbols);
}

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
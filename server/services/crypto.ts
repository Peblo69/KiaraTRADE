import axios from "axios";

interface PriceData {
  price: number;
  change24h: number;
  lastUpdated: number;
}

interface MarketOverview {
  total_coins: number;
  total_exchanges: number;
  market_cap: {
    value: number;
    change_24h: number;
  };
  volume_24h: number;
  btc_dominance: number;
  eth_dominance: number;
  gas_price: number;
}

class CryptoService {
  private cache: Map<string, PriceData> = new Map();
  private marketOverviewCache: {
    data: MarketOverview | null;
    lastUpdated: number;
  } = {
    data: null,
    lastUpdated: 0
  };
  private readonly MIN_REQUEST_INTERVAL = 2000; // 2 seconds between requests
  private readonly CACHE_DURATION = 30000; // 30 seconds cache
  private readonly REQUEST_TIMEOUT = 5000; // 5 seconds timeout

  private async fetchWithRetry<T>(url: string, retries = 3): Promise<T> {
    let lastError;
    for (let i = 0; i < retries; i++) {
      try {
        const response = await axios.get(url, {
          timeout: this.REQUEST_TIMEOUT,
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'KiaraAI/1.0'
          }
        });
        return response.data;
      } catch (error: any) {
        console.error(`Attempt ${i + 1} failed:`, error.message);
        lastError = error;
        if (error.response?.status === 429) {
          const retryAfter = parseInt(error.response.headers['retry-after']) || 60;
          await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
        } else {
          await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
        }
      }
    }
    throw lastError;
  }

  async getMarketOverview(): Promise<MarketOverview> {
    const now = Date.now();

    // Return cache if fresh (30 seconds)
    if (this.marketOverviewCache.data && now - this.marketOverviewCache.lastUpdated < this.CACHE_DURATION) {
      return this.marketOverviewCache.data;
    }

    try {
      const data = await this.fetchWithRetry<any>('https://api.coingecko.com/api/v3/global');

      if (!data || !data.data) {
        throw new Error('Invalid response from CoinGecko API');
      }

      const marketData = data.data;
      const overview: MarketOverview = {
        total_coins: marketData.active_cryptocurrencies || 0,
        total_exchanges: marketData.markets || 0,
        market_cap: {
          value: marketData.total_market_cap?.usd || 0,
          change_24h: marketData.market_cap_change_percentage_24h_usd || 0
        },
        volume_24h: marketData.total_volume?.usd || 0,
        btc_dominance: marketData.market_cap_percentage?.btc || 0,
        eth_dominance: marketData.market_cap_percentage?.eth || 0,
        gas_price: Math.round(Math.random() * 20 + 5) // Simplified gas price simulation
      };

      this.marketOverviewCache = {
        data: overview,
        lastUpdated: now
      };

      return overview;
    } catch (error: any) {
      console.error('Error fetching market overview:', error.message);

      // Return last cached data if available, otherwise return default values
      return this.marketOverviewCache.data || {
        total_coins: 0,
        total_exchanges: 0,
        market_cap: { value: 0, change_24h: 0 },
        volume_24h: 0,
        btc_dominance: 0,
        eth_dominance: 0,
        gas_price: 0
      };
    }
  }

  async getPriceData(coinId: string): Promise<PriceData> {
    const cached = this.cache.get(coinId);
    const now = Date.now();

    if (cached && now - cached.lastUpdated < this.CACHE_DURATION) {
      return cached;
    }

    try {
      const data = await this.fetchWithRetry<any>(
        `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd&include_24hr_change=true`
      );

      if (!data || !data[coinId]) {
        throw new Error(`No data returned for ${coinId}`);
      }

      const priceData: PriceData = {
        price: data[coinId].usd || 0,
        change24h: data[coinId].usd_24h_change || 0,
        lastUpdated: Date.now()
      };

      this.cache.set(coinId, priceData);
      return priceData;
    } catch (error: any) {
      console.error(`Error fetching price for ${coinId}:`, error.message);
      return cached || {
        price: 0,
        change24h: 0,
        lastUpdated: now
      };
    }
  }

  getActiveSymbols(): string[] {
    return Array.from(this.cache.keys());
  }

  getCacheStatus() {
    return {
      cacheSize: this.cache.size,
      marketOverviewAge: Math.floor((Date.now() - (this.marketOverviewCache.lastUpdated || 0)) / 1000)
    };
  }
}

export const cryptoService = new CryptoService();
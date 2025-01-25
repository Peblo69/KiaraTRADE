import axios from "axios";

interface PriceData {
  price: number;
  change24h: number;
  lastUpdated: number;
  volume: number;
  historicalPrices: number[];
  historicalVolumes: number[];
}

const KUCOIN_API_BASE = 'https://api.kucoin.com/api/v1';
const CACHE_DURATION = 60000; // 1 minute cache

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
  private readonly REQUEST_TIMEOUT = 10000; // 10 seconds

  private async fetchWithRetry<T>(url: string, retries = 3): Promise<T> {
    let lastError;
    for (let i = 0; i < retries; i++) {
      try {
        const response = await axios.get(url, {
          timeout: this.REQUEST_TIMEOUT,
          headers: { 'Accept': 'application/json' }
        });
        return response.data;
      } catch (error: any) {
        console.error(`Attempt ${i + 1} failed:`, error.message);
        lastError = error;
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
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

  async getPriceData(symbol: string): Promise<PriceData> {
    const cached = this.cache.get(symbol);
    const now = Date.now();

    if (cached && now - cached.lastUpdated < CACHE_DURATION) {
      return cached;
    }

    try {
      // Fetch current market stats
      const statsResponse = await this.fetchWithRetry<any>(
        `${KUCOIN_API_BASE}/market/stats?symbol=${symbol}`
      );

      if (!statsResponse.data) {
        throw new Error(`No data returned for ${symbol}`);
      }

      // Fetch historical klines for technical analysis
      const klinesResponse = await this.fetchWithRetry<any>(
        `${KUCOIN_API_BASE}/market/candles?symbol=${symbol}&type=1min&startAt=${Math.floor((now - 24 * 60 * 60 * 1000) / 1000)}&endAt=${Math.floor(now / 1000)}`
      );

      // Process historical data
      const historicalData = klinesResponse.data
        ? klinesResponse.data.reverse().map((kline: string[]) => ({
            price: parseFloat(kline[2]), // close price
            volume: parseFloat(kline[5]) // volume
          }))
        : [];

      const priceData: PriceData = {
        price: parseFloat(statsResponse.data.last),
        change24h: parseFloat(statsResponse.data.changeRate) * 100,
        volume: parseFloat(statsResponse.data.vol),
        historicalPrices: historicalData.map(d => d.price),
        historicalVolumes: historicalData.map(d => d.volume),
        lastUpdated: now
      };

      this.cache.set(symbol, priceData);
      return priceData;
    } catch (error: any) {
      console.error(`Error fetching price for ${symbol}:`, error.message);
      if (cached) {
        console.log(`Returning cached data for ${symbol}`);
        return cached;
      }
      throw error;
    }
  }

  getActiveSymbols(): string[] {
    return Array.from(this.cache.keys());
  }

  getCacheStatus() {
    return {
      cacheSize: this.cache.size,
      lastUpdated: Array.from(this.cache.values()).map(v => v.lastUpdated)
    };
  }
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

export const cryptoService = new CryptoService();
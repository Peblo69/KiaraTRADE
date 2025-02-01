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

interface MarketContext {
  correlations: Array<{
    token: string;
    correlation: number;
  }>;
  volumeAnalysis: {
    current: number;
    average: number;
    trend: 'up' | 'down';
    unusualActivity: boolean;
  };
  marketDepth: {
    buyPressure: number;
    sellPressure: number;
    strongestSupport: number;
    strongestResistance: number;
  };
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
  private readonly REQUEST_TIMEOUT = 10000; // 10 seconds
  private readonly CACHE_DURATION = 20000; // 20 seconds cache duration

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

    // Return cache if fresh (20 seconds)
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

    if (cached && now - cached.lastUpdated < this.CACHE_DURATION) {
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
        historicalPrices: historicalData.map((d: any) => d.price),
        historicalVolumes: historicalData.map((d: any) => d.volume),
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

  private calculateCorrelation(prices1: number[], prices2: number[]): number {
    const n = Math.min(prices1.length, prices2.length);
    if (n < 2) return 0;

    const returns1 = prices1.slice(0, n - 1).map((p, i) => (prices1[i + 1] - p) / p);
    const returns2 = prices2.slice(0, n - 1).map((p, i) => (prices2[i + 1] - p) / p);

    const avg1 = returns1.reduce((a, b) => a + b, 0) / returns1.length;
    const avg2 = returns2.reduce((a, b) => a + b, 0) / returns2.length;

    const cov = returns1.reduce((sum, r1, i) =>
      sum + (r1 - avg1) * (returns2[i] - avg2), 0) / returns1.length;

    const std1 = Math.sqrt(returns1.reduce((sum, r) =>
      sum + Math.pow(r - avg1, 2), 0) / returns1.length);
    const std2 = Math.sqrt(returns2.reduce((sum, r) =>
      sum + Math.pow(r - avg2, 2), 0) / returns2.length);

    return cov / (std1 * std2);
  }

  private analyzeVolume(volumes: number[]): {
    current: number;
    average: number;
    trend: 'up' | 'down';
    unusualActivity: boolean;
  } {
    const current = volumes[volumes.length - 1];
    const average = volumes.reduce((a, b) => a + b, 0) / volumes.length;
    const trend = current > volumes[volumes.length - 2] ? 'up' : 'down';

    // Calculate volume standard deviation
    const std = Math.sqrt(
      volumes.reduce((sum, vol) =>
        sum + Math.pow(vol - average, 2), 0) / volumes.length
    );

    // Volume is unusual if it's more than 2 standard deviations from the mean
    const unusualActivity = Math.abs(current - average) > 2 * std;

    return {
      current,
      average,
      trend,
      unusualActivity
    };
  }

  private calculateMarketDepth(
    prices: number[],
    volumes: number[]
  ): {
    buyPressure: number;
    sellPressure: number;
    strongestSupport: number;
    strongestResistance: number;
  } {
    const currentPrice = prices[prices.length - 1];

    // Calculate volume-weighted price levels
    const priceVolumes = prices.map((price, i) => ({
      price,
      volume: volumes[i]
    }));

    // Group by price ranges and sum volumes
    const ranges = new Map<number, number>();
    const rangeSize = (Math.max(...prices) - Math.min(...prices)) / 20;

    priceVolumes.forEach(({ price, volume }) => {
      const range = Math.floor(price / rangeSize) * rangeSize;
      ranges.set(range, (ranges.get(range) || 0) + volume);
    });

    // Find support and resistance levels
    const levels = Array.from(ranges.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);

    const supports = levels
      .map(([price]) => price)
      .filter(price => price < currentPrice);
    const resistances = levels
      .map(([price]) => price)
      .filter(price => price > currentPrice);

    // Calculate buy/sell pressure based on recent volume
    const recentVolumes = volumes.slice(-10);
    const recentPrices = prices.slice(-10);

    let buyVolume = 0;
    let sellVolume = 0;

    recentPrices.forEach((price, i) => {
      if (i === 0) return;
      const priceChange = price - recentPrices[i - 1];
      if (priceChange > 0) {
        buyVolume += recentVolumes[i];
      } else {
        sellVolume += recentVolumes[i];
      }
    });

    const totalVolume = buyVolume + sellVolume;
    const buyPressure = (buyVolume / totalVolume) * 100;
    const sellPressure = (sellVolume / totalVolume) * 100;

    return {
      buyPressure,
      sellPressure,
      strongestSupport: supports[0] || currentPrice * 0.95,
      strongestResistance: resistances[0] || currentPrice * 1.05
    };
  }

  async getMarketContext(symbol: string): Promise<MarketContext> {
    try {
      // Get data for the main token
      const mainData = await this.getPriceData(symbol);
      if (!mainData) throw new Error(`No data available for ${symbol}`);

      // Get correlation with major tokens
      const correlationTokens = ['BTC-USDT', 'ETH-USDT'];
      const correlations = await Promise.all(
        correlationTokens.map(async (token) => {
          if (token === symbol) return null;
          const tokenData = await this.getPriceData(token);
          if (!tokenData) return null;

          return {
            token: token.replace('-USDT', ''),
            correlation: this.calculateCorrelation(
              mainData.historicalPrices,
              tokenData.historicalPrices
            )
          };
        })
      );

      // Analyze volume
      const volumeAnalysis = this.analyzeVolume(mainData.historicalVolumes);

      // Calculate market depth
      const marketDepth = this.calculateMarketDepth(
        mainData.historicalPrices,
        mainData.historicalVolumes
      );

      return {
        correlations: correlations.filter(Boolean) as Array<{ token: string; correlation: number }>,
        volumeAnalysis,
        marketDepth
      };
    } catch (error) {
      console.error('Error getting market context:', error);
      throw error;
    }
  }
}

export const cryptoService = new CryptoService();
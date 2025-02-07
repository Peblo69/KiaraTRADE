
import axios from 'axios';
import { CryptoPrice } from '../types/prediction';

class PricePredictionService {
  private cache: Map<string, { prediction: CryptoPrice; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  async getPricePrediction(symbol: string): Promise<CryptoPrice> {
    const now = Date.now();
    const cached = this.cache.get(symbol);

    if (cached && now - cached.timestamp < this.CACHE_DURATION) {
      return cached.prediction;
    }

    try {
      // Calculate prediction based on recent price data
      const [shortTerm, longTerm] = await Promise.all([
        this.getShortTermPrediction(symbol),
        this.getLongTermPrediction(symbol)
      ]);

      const prediction = {
        symbol,
        currentPrice: shortTerm.currentPrice,
        predictions: {
          hourly: shortTerm.hourly,
          daily: shortTerm.daily,
          weekly: longTerm.weekly,
          monthly: longTerm.monthly
        },
        confidence: {
          hourly: shortTerm.confidence,
          daily: shortTerm.confidence,
          weekly: longTerm.confidence,
          monthly: longTerm.confidence
        },
        timestamp: now
      };

      this.cache.set(symbol, { prediction, timestamp: now });
      return prediction;
    } catch (error) {
      console.error(`Failed to generate prediction for ${symbol}:`, error);
      throw error;
    }
  }

  private async getShortTermPrediction(symbol: string) {
    // Get recent price data
    const response = await axios.get(`https://api.kucoin.com/api/v1/market/stats?symbol=${symbol}`);
    const data = response.data.data;
    
    const currentPrice = parseFloat(data.last);
    const high = parseFloat(data.high);
    const low = parseFloat(data.low);
    const changeRate = parseFloat(data.changeRate);

    // Simple prediction logic
    const volatility = (high - low) / currentPrice;
    const trend = changeRate > 0 ? 1 : -1;
    const momentum = Math.abs(changeRate);

    const hourlyChange = momentum * volatility * trend * 0.5;
    const dailyChange = momentum * volatility * trend;

    return {
      currentPrice,
      hourly: currentPrice * (1 + hourlyChange),
      daily: currentPrice * (1 + dailyChange),
      confidence: Math.max(0.5, 1 - volatility)
    };
  }

  private async getLongTermPrediction(symbol: string) {
    // Get historical data for longer-term predictions
    const endTime = Math.floor(Date.now() / 1000);
    const startTime = endTime - (7 * 24 * 60 * 60); // 7 days

    const response = await axios.get(
      `https://api.kucoin.com/api/v1/market/candles?symbol=${symbol}&type=1day&startAt=${startTime}&endAt=${endTime}`
    );

    const prices = response.data.data.map((candle: string[]) => parseFloat(candle[2]));
    const currentPrice = prices[0];
    
    // Calculate trend and volatility
    const avgPrice = prices.reduce((a: number, b: number) => a + b, 0) / prices.length;
    const trend = currentPrice > avgPrice ? 1 : -1;
    const volatility = Math.std(prices) / avgPrice;

    const weeklyChange = trend * (1 - volatility) * 0.1;
    const monthlyChange = trend * (1 - volatility) * 0.25;

    return {
      weekly: currentPrice * (1 + weeklyChange),
      monthly: currentPrice * (1 + monthlyChange),
      confidence: Math.max(0.4, 1 - volatility)
    };
  }
}

export const pricePredictionService = new PricePredictionService();

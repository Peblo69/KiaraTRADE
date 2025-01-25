import { cryptoService } from './crypto';
import type { PredictionResult } from '../types/prediction';

interface IndicatorValues {
  rsi: number;
  macd: number;
  ema: number;
  bollingerBands: {
    upper: number;
    middle: number;
    lower: number;
  };
  volumeProfile: {
    value: number;
    strength: number;
  };
  fibonacci: {
    levels: number[];
    current: number;
  };
}

class PricePredictionService {
  private readonly RSI_PERIOD = 14;
  private readonly MACD_FAST = 12;
  private readonly MACD_SLOW = 26;
  private readonly MACD_SIGNAL = 9;
  private readonly EMA_PERIOD = 20;
  private readonly BOLLINGER_PERIOD = 20;
  private readonly BOLLINGER_STD = 2;
  private readonly VOLUME_PERIODS = [15, 30, 60]; // minutes

  // Calculate Bollinger Bands
  private calculateBollingerBands(prices: number[]): { upper: number; middle: number; lower: number } {
    if (prices.length < this.BOLLINGER_PERIOD) {
      return { upper: 0, middle: 0, lower: 0 };
    }

    const recentPrices = prices.slice(-this.BOLLINGER_PERIOD);
    const sma = recentPrices.reduce((sum, price) => sum + price, 0) / this.BOLLINGER_PERIOD;

    const squaredDiffs = recentPrices.map(price => Math.pow(price - sma, 2));
    const standardDeviation = Math.sqrt(squaredDiffs.reduce((sum, diff) => sum + diff, 0) / this.BOLLINGER_PERIOD);

    return {
      upper: sma + (this.BOLLINGER_STD * standardDeviation),
      middle: sma,
      lower: sma - (this.BOLLINGER_STD * standardDeviation)
    };
  }

  // Calculate Fibonacci retracement levels
  private calculateFibonacciLevels(high: number, low: number): number[] {
    const diff = high - low;
    return [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1].map(level => low + (diff * level));
  }

  // Calculate Volume Profile
  private calculateVolumeProfile(prices: number[], volumes: number[]): { value: number; strength: number } {
    if (prices.length === 0 || volumes.length === 0) {
      return { value: 0, strength: 0 };
    }

    const volumeWeightedPrice = prices.reduce((sum, price, i) => sum + (price * volumes[i]), 0) / 
                               volumes.reduce((sum, vol) => sum + vol, 0);

    const averageVolume = volumes.reduce((sum, vol) => sum + vol, 0) / volumes.length;
    const recentVolume = volumes[volumes.length - 1];
    const volumeStrength = recentVolume / averageVolume;

    return {
      value: volumeWeightedPrice,
      strength: volumeStrength
    };
  }

  // Enhanced RSI calculation with volume weighting
  private calculateRSI(prices: number[], volumes: number[] = []): number {
    if (prices.length < this.RSI_PERIOD) return 50;

    let gains = 0;
    let losses = 0;
    const useVolume = volumes.length === prices.length;

    for (let i = 1; i < this.RSI_PERIOD + 1; i++) {
      const difference = prices[i] - prices[i - 1];
      const volumeWeight = useVolume ? volumes[i] / Math.max(...volumes) : 1;

      if (difference >= 0) {
        gains += difference * volumeWeight;
      } else {
        losses -= difference * volumeWeight;
      }
    }

    const avgGain = gains / this.RSI_PERIOD;
    const avgLoss = losses / this.RSI_PERIOD;
    const rs = avgGain / (avgLoss === 0 ? 1 : avgLoss);
    return 100 - (100 / (1 + rs));
  }

  // Enhanced MACD with multiple timeframe analysis
  private calculateMACD(prices: number[]): number {
    if (prices.length < this.MACD_SLOW) return 0;

    const fastEMA = this.calculateEMA(prices, this.MACD_FAST);
    const slowEMA = this.calculateEMA(prices, this.MACD_SLOW);
    const macdLine = fastEMA - slowEMA;
    const signalLine = this.calculateEMA([...Array(this.MACD_SLOW - 1).fill(0), macdLine], this.MACD_SIGNAL);

    return macdLine - signalLine; // MACD histogram
  }

  // Enhanced EMA calculation
  private calculateEMA(prices: number[], period: number): number {
    if (prices.length < period) return prices[prices.length - 1];

    const multiplier = 2 / (period + 1);
    let ema = prices.slice(0, period).reduce((sum, price) => sum + price, 0) / period;

    for (let i = period; i < prices.length; i++) {
      ema = (prices[i] - ema) * multiplier + ema;
    }

    return ema;
  }

  // Calculate all technical indicators
  private calculateIndicators(prices: number[], volumes: number[] = []): IndicatorValues {
    const high = Math.max(...prices);
    const low = Math.min(...prices);

    return {
      rsi: this.calculateRSI(prices, volumes),
      macd: this.calculateMACD(prices),
      ema: this.calculateEMA(prices, this.EMA_PERIOD),
      bollingerBands: this.calculateBollingerBands(prices),
      volumeProfile: this.calculateVolumeProfile(prices, volumes),
      fibonacci: {
        levels: this.calculateFibonacciLevels(high, low),
        current: prices[prices.length - 1]
      }
    };
  }

  // Generate advanced price prediction
  private generatePrediction(
    currentPrice: number,
    indicators: IndicatorValues
  ): PredictionResult {
    // Advanced signal analysis
    let bullishSignals = 0;
    let bearishSignals = 0;
    let totalSignals = 0;

    // RSI Analysis (Weighted: 2)
    if (indicators.rsi > 70) { bearishSignals += 2; }
    if (indicators.rsi < 30) { bullishSignals += 2; }
    totalSignals += 2;

    // MACD Analysis (Weighted: 2)
    if (indicators.macd > 0) { bullishSignals += 2; }
    if (indicators.macd < 0) { bearishSignals += 2; }
    totalSignals += 2;

    // EMA Analysis (Weighted: 1)
    if (currentPrice > indicators.ema) { bullishSignals += 1; }
    if (currentPrice < indicators.ema) { bearishSignals += 1; }
    totalSignals += 1;

    // Bollinger Bands Analysis (Weighted: 2)
    if (currentPrice <= indicators.bollingerBands.lower) { bullishSignals += 2; }
    if (currentPrice >= indicators.bollingerBands.upper) { bearishSignals += 2; }
    totalSignals += 2;

    // Volume Profile Analysis (Weighted: 2)
    if (indicators.volumeProfile.strength > 1.5) {
      if (currentPrice > indicators.volumeProfile.value) { bullishSignals += 2; }
      if (currentPrice < indicators.volumeProfile.value) { bearishSignals += 2; }
    }
    totalSignals += 2;

    // Fibonacci Analysis (Weighted: 1)
    const fibLevel = indicators.fibonacci.levels.findIndex(
      level => indicators.fibonacci.current <= level
    );
    if (fibLevel <= 2) { bullishSignals += 1; }
    if (fibLevel >= 5) { bearishSignals += 1; }
    totalSignals += 1;

    const sentiment = bullishSignals > bearishSignals ? 'bullish' : 'bearish';
    const confidence = Math.abs(bullishSignals - bearishSignals) / totalSignals;

    // Calculate predicted price range using volatility and technical levels
    const volatilityFactor = Math.abs(
      indicators.bollingerBands.upper - indicators.bollingerBands.lower
    ) / currentPrice;

    const priceChange = currentPrice * volatilityFactor * confidence;

    return {
      currentPrice,
      predictedPriceRange: {
        low: sentiment === 'bearish' ? currentPrice - priceChange : currentPrice,
        high: sentiment === 'bullish' ? currentPrice + priceChange : currentPrice
      },
      sentiment,
      confidence,
      indicators: {
        rsi: indicators.rsi,
        macd: indicators.macd,
        ema: indicators.ema
      },
      timestamp: Date.now()
    };
  }

  // Public method to get price prediction
  async getPricePrediction(symbol: string): Promise<PredictionResult> {
    try {
      const priceData = await cryptoService.getPriceData(symbol);

      if (!priceData) {
        throw new Error(`No price data available for ${symbol}`);
      }

      const indicators = this.calculateIndicators([priceData.price], [priceData.volume]);
      return this.generatePrediction(priceData.price, indicators);
    } catch (error) {
      console.error(`Error generating prediction for ${symbol}:`, error);
      throw error;
    }
  }
}

export const pricePredictionService = new PricePredictionService();
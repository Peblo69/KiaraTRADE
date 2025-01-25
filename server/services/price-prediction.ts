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
  atr: number;
  pivotPoints: {
    pivot: number;
    r1: number;
    r2: number;
    s1: number;
    s2: number;
  };
  patterns: {
    name: string;
    confidence: number;
    type: 'bullish' | 'bearish';
  }[];
}

class PricePredictionService {
  private readonly RSI_PERIOD = 14;
  private readonly MACD_FAST = 12;
  private readonly MACD_SLOW = 26;
  private readonly MACD_SIGNAL = 9;
  private readonly EMA_PERIOD = 20;
  private readonly BOLLINGER_PERIOD = 20;
  private readonly BOLLINGER_STD = 2;
  private readonly ATR_PERIOD = 14;

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

  private calculateFibonacciLevels(high: number, low: number): number[] {
    const diff = high - low;
    return [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1].map(level => low + (diff * level));
  }

  private calculatePivotPoints(high: number, low: number, close: number) {
    const pivot = (high + low + close) / 3;
    return {
      pivot,
      r1: (2 * pivot) - low,
      r2: pivot + (high - low),
      s1: (2 * pivot) - high,
      s2: pivot - (high - low)
    };
  }

  private calculateATR(highs: number[], lows: number[], closes: number[]): number {
    if (highs.length < 2) return 0;

    const ranges = highs.map((high, i) => {
      if (i === 0) return high - lows[i];
      const tr1 = high - lows[i];
      const tr2 = Math.abs(high - closes[i - 1]);
      const tr3 = Math.abs(lows[i] - closes[i - 1]);
      return Math.max(tr1, tr2, tr3);
    });

    return ranges.reduce((sum, range) => sum + range, 0) / ranges.length;
  }

  private detectPatterns(prices: number[], volumes: number[]): { name: string; confidence: number; type: 'bullish' | 'bearish'; }[] {
    const patterns: { name: string; confidence: number; type: 'bullish' | 'bearish'; }[] = [];
    const len = prices.length;
    if (len < 20) return patterns;

    // Head and Shoulders Pattern
    const last20 = prices.slice(-20);
    const leftShoulder = Math.max(...last20.slice(0, 5));
    const head = Math.max(...last20.slice(5, 10));
    const rightShoulder = Math.max(...last20.slice(10, 15));

    if (head > leftShoulder && head > rightShoulder &&
        Math.abs(leftShoulder - rightShoulder) / leftShoulder < 0.1) {
      patterns.push({
        name: 'Head and Shoulders',
        confidence: 0.85,
        type: 'bearish'
      });
    }

    // Double Bottom Pattern
    const last10 = prices.slice(-10);
    const firstBottom = Math.min(...last10.slice(0, 5));
    const secondBottom = Math.min(...last10.slice(5));

    if (Math.abs(firstBottom - secondBottom) / firstBottom < 0.02) {
      patterns.push({
        name: 'Double Bottom',
        confidence: 0.8,
        type: 'bullish'
      });
    }

    // Volume Price Confirmation
    const recentVolume = volumes.slice(-5);
    const avgVolume = volumes.slice(-20, -5).reduce((sum, vol) => sum + vol, 0) / 15;

    if (recentVolume.every(vol => vol > avgVolume * 1.5)) {
      patterns.push({
        name: 'Volume Breakout',
        confidence: 0.75,
        type: prices[prices.length - 1] > prices[prices.length - 5] ? 'bullish' : 'bearish'
      });
    }

    return patterns;
  }

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

  private calculateRSI(prices: number[], volumes: number[]): number {
    if (prices.length < this.RSI_PERIOD) return 50;

    let gains = 0;
    let losses = 0;

    for (let i = 1; i < this.RSI_PERIOD + 1; i++) {
      const difference = prices[i] - prices[i - 1];
      const volumeWeight = volumes[i] / Math.max(...volumes.slice(0, this.RSI_PERIOD + 1));

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

  private calculateMACD(prices: number[]): number {
    if (prices.length < this.MACD_SLOW) return 0;

    const fastEMA = this.calculateEMA(prices, this.MACD_FAST);
    const slowEMA = this.calculateEMA(prices, this.MACD_SLOW);
    const macdLine = fastEMA - slowEMA;
    const signalLine = this.calculateEMA([...Array(this.MACD_SLOW - 1).fill(0), macdLine], this.MACD_SIGNAL);

    return macdLine - signalLine;
  }

  private calculateEMA(prices: number[], period: number): number {
    if (prices.length < period) return prices[prices.length - 1];

    const multiplier = 2 / (period + 1);
    let ema = prices.slice(0, period).reduce((sum, price) => sum + price, 0) / period;

    for (let i = period; i < prices.length; i++) {
      ema = (prices[i] - ema) * multiplier + ema;
    }

    return ema;
  }

  private calculateIndicators(prices: number[], volumes: number[]): IndicatorValues {
    const high = Math.max(...prices);
    const low = Math.min(...prices);
    const close = prices[prices.length - 1];

    const highs = prices.map((p, i) => Math.max(p, prices[i - 1] || p));
    const lows = prices.map((p, i) => Math.min(p, prices[i - 1] || p));
    const closes = prices.slice(0, -1);

    return {
      rsi: this.calculateRSI(prices, volumes),
      macd: this.calculateMACD(prices),
      ema: this.calculateEMA(prices, this.EMA_PERIOD),
      bollingerBands: this.calculateBollingerBands(prices),
      volumeProfile: this.calculateVolumeProfile(prices, volumes),
      fibonacci: {
        levels: this.calculateFibonacciLevels(high, low),
        current: close
      },
      atr: this.calculateATR(highs, lows, closes),
      pivotPoints: this.calculatePivotPoints(high, low, close),
      patterns: this.detectPatterns(prices, volumes)
    };
  }

  private generatePrediction(
    currentPrice: number,
    indicators: IndicatorValues
  ): PredictionResult {
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

    // Fibonacci Analysis (Weighted: 2)
    const currentFibLevel = indicators.fibonacci.levels.findIndex(
      level => indicators.fibonacci.current <= level
    );
    if (currentFibLevel <= 2) { bullishSignals += 2; }
    if (currentFibLevel >= 5) { bearishSignals += 2; }
    totalSignals += 2;

    // Pattern Analysis (Weighted: 3)
    indicators.patterns.forEach(pattern => {
      if (pattern.type === 'bullish') { bullishSignals += 3 * pattern.confidence; }
      if (pattern.type === 'bearish') { bearishSignals += 3 * pattern.confidence; }
      totalSignals += 3;
    });

    const sentiment = bullishSignals > bearishSignals ? 'bullish' : 'bearish';
    const confidence = Math.abs(bullishSignals - bearishSignals) / totalSignals;

    // Enhanced 24-hour prediction range calculation
    // Use ATR for volatility-based range and multiply by 24 for daily projection
    const dailyVolatilityRange = indicators.atr * 24;
    const trendMultiplier = sentiment === 'bullish' ? 1 + confidence : 1 - confidence;

    // Calculate predicted range incorporating trend and confidence
    const predictedChange = currentPrice * (dailyVolatilityRange / currentPrice) * trendMultiplier;

    // For bearish sentiment, we expect price to go down
    const baseRange = sentiment === 'bearish' ?
      {
        low: currentPrice - predictedChange,
        high: currentPrice
      } :
      {
        low: currentPrice,
        high: currentPrice + predictedChange
      };

    // Adjust range based on confidence and support/resistance levels
    const range = {
      low: Math.max(baseRange.low, indicators.pivotPoints.s2),
      high: Math.min(baseRange.high, indicators.pivotPoints.r2)
    };

    return {
      currentPrice,
      predictedPriceRange: range,
      sentiment,
      confidence,
      indicators,
      timestamp: Date.now()
    };
  }

  async getPricePrediction(symbol: string): Promise<PredictionResult> {
    try {
      const priceData = await cryptoService.getPriceData(symbol);

      if (!priceData) {
        throw new Error(`No price data available for ${symbol}`);
      }

      const indicators = this.calculateIndicators(
        priceData.historicalPrices,
        priceData.historicalVolumes
      );

      return this.generatePrediction(priceData.price, indicators);
    } catch (error) {
      console.error(`Error generating prediction for ${symbol}:`, error);
      throw error;
    }
  }
}

export const pricePredictionService = new PricePredictionService();
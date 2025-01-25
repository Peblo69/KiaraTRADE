import { cryptoService } from './crypto';
import type { PredictionResult } from '../types/prediction';

interface IndicatorValues {
  rsi: number;
  macd: number;
  ema: number;
}

class PricePredictionService {
  private readonly RSI_PERIOD = 14;
  private readonly MACD_FAST = 12;
  private readonly MACD_SLOW = 26;
  private readonly MACD_SIGNAL = 9;
  private readonly EMA_PERIOD = 20;

  // Calculate Relative Strength Index (RSI)
  private calculateRSI(prices: number[]): number {
    if (prices.length < this.RSI_PERIOD) return 50;

    let gains = 0;
    let losses = 0;

    for (let i = 1; i < this.RSI_PERIOD + 1; i++) {
      const difference = prices[i] - prices[i - 1];
      if (difference >= 0) {
        gains += difference;
      } else {
        losses -= difference;
      }
    }

    const avgGain = gains / this.RSI_PERIOD;
    const avgLoss = losses / this.RSI_PERIOD;
    const rs = avgGain / (avgLoss === 0 ? 1 : avgLoss);
    return 100 - (100 / (1 + rs));
  }

  // Calculate Moving Average Convergence Divergence (MACD)
  private calculateMACD(prices: number[]): number {
    if (prices.length < this.MACD_SLOW) return 0;

    const fastEMA = this.calculateEMA(prices, this.MACD_FAST);
    const slowEMA = this.calculateEMA(prices, this.MACD_SLOW);
    return fastEMA - slowEMA;
  }

  // Calculate Exponential Moving Average (EMA)
  private calculateEMA(prices: number[], period: number): number {
    if (prices.length < period) return prices[prices.length - 1];

    const multiplier = 2 / (period + 1);
    let ema = prices.slice(0, period).reduce((sum, price) => sum + price, 0) / period;

    for (let i = period; i < prices.length; i++) {
      ema = (prices[i] - ema) * multiplier + ema;
    }

    return ema;
  }

  // Calculate technical indicators
  private calculateIndicators(prices: number[]): IndicatorValues {
    return {
      rsi: this.calculateRSI(prices),
      macd: this.calculateMACD(prices),
      ema: this.calculateEMA(prices, this.EMA_PERIOD)
    };
  }

  // Generate price prediction based on technical analysis
  private generatePrediction(
    currentPrice: number,
    indicators: IndicatorValues
  ): PredictionResult {
    // Basic prediction logic using technical indicators
    let bullishSignals = 0;
    let bearishSignals = 0;

    // RSI signals
    if (indicators.rsi > 70) bearishSignals++;
    if (indicators.rsi < 30) bullishSignals++;

    // MACD signals
    if (indicators.macd > 0) bullishSignals++;
    if (indicators.macd < 0) bearishSignals++;

    // EMA signals
    if (currentPrice > indicators.ema) bullishSignals++;
    if (currentPrice < indicators.ema) bearishSignals++;

    const sentiment = bullishSignals > bearishSignals ? 'bullish' : 'bearish';
    const confidence = Math.abs(bullishSignals - bearishSignals) / 3; // 0 to 1 scale

    // Calculate predicted price range
    const volatilityFactor = 0.02; // 2% base volatility
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

  // Public method to get price prediction for a token
  async getPricePrediction(symbol: string): Promise<PredictionResult> {
    try {
      // Get historical price data from crypto service
      const priceData = await cryptoService.getPriceData(symbol);
      
      if (!priceData) {
        throw new Error(`No price data available for ${symbol}`);
      }

      // Calculate indicators using current and historical prices
      const indicators = this.calculateIndicators([priceData.price]);

      // Generate prediction
      return this.generatePrediction(priceData.price, indicators);
    } catch (error) {
      console.error(`Error generating prediction for ${symbol}:`, error);
      throw error;
    }
  }
}

export const pricePredictionService = new PricePredictionService();

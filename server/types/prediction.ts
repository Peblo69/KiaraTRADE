export interface PredictionResult {
  currentPrice: number;
  predictedPriceRange: {
    low: number;
    high: number;
  };
  sentiment: 'bullish' | 'bearish';
  confidence: number;
  indicators: {
    rsi: number;
    macd: number;
    ema: number;
  };
  timestamp: number;
}

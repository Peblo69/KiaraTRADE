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
  };
  timestamp: number;
}

export interface CryptoPrice {
  symbol: string;
  currentPrice: number;
  predictions: {
    hourly: number;
    daily: number;
    weekly: number;
    monthly: number;
  };
  confidence: {
    hourly: number;
    daily: number;
    weekly: number;
    monthly: number;
  };
  timestamp: number;
}

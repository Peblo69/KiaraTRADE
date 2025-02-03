// Basic types for our chart data
export interface Trade {
  timestamp: number;    // Unix timestamp in milliseconds
  priceInUsd: number;  // Price in USD
  amount: number;      // Trade amount
}

export interface CandlestickData {
  time: number;    // Unix timestamp in seconds
  open: number;    // Opening price
  high: number;    // Highest price
  low: number;     // Lowest price
  close: number;   // Closing price
  volume: number;  // Trading volume
}

export interface ChartData {
  candles: CandlestickData[];
  currentPrice: number;
}

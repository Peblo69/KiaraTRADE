export interface Trade {
  timestamp: number;
  priceInUsd: number;
  amount: number;
}

export interface ChartData {
  candles: CandlestickData[];
  currentPrice: number;
}

export interface CandlestickData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

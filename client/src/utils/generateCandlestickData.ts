// client/src/utils/generateCandlestickData.ts
import { TokenTrade } from '@/types/token';

export interface CandlestickData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export function generateCandlestickData(
  trades: TokenTrade[],
  bucketSizeSeconds: number = 60
): CandlestickData[] {
  if (!trades || trades.length === 0) return [];

  const sortedTrades = [...trades].sort((a, b) => a.timestamp - b.timestamp);
  const candlesticks: CandlestickData[] = [];
  let currentBucket: { [key: number]: TokenTrade[] } = {};

  // Group trades by time bucket
  sortedTrades.forEach(trade => {
    const bucketTime = Math.floor(trade.timestamp / 1000 / bucketSizeSeconds) * bucketSizeSeconds;
    if (!currentBucket[bucketTime]) {
      currentBucket[bucketTime] = [];
    }
    currentBucket[bucketTime].push(trade);
  });

  // Convert buckets to candlesticks
  Object.entries(currentBucket).forEach(([time, trades]) => {
    if (trades.length === 0) return;

    const prices = trades.map(t => t.priceInUsd || 0).filter(p => p > 0);
    if (prices.length === 0) return;

    candlesticks.push({
      time: parseInt(time),
      open: prices[0],
      high: Math.max(...prices),
      low: Math.min(...prices),
      close: prices[prices.length - 1],
      volume: trades.reduce((sum, t) => sum + (t.tokenAmount || 0), 0)
    });
  });

  return candlesticks.sort((a, b) => a.time - b.time);
}
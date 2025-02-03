// client/src/utils/generateCandlestickData.ts
import { TokenTrade } from '@/types/token';

export interface CandlestickData {
  time: number; // UNIX timestamp in seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/**
 * Groups trades into candlestick data based on a bucket size (in seconds).
 * Uses fallbackPrice if a trade price is missing.
 */
export function generateCandlestickData(
  trades: TokenTrade[],
  bucketSizeSeconds: number = 60,
  fallbackPrice: number = 0
): CandlestickData[] {
  if (!trades || trades.length === 0) return [];

  // Sort trades by timestamp (oldest first)
  const sortedTrades = [...trades].sort((a, b) => a.timestamp - b.timestamp);
  const candlesticks: any[] = [];

  let currentBucket = Math.floor(sortedTrades[0].timestamp / 1000 / bucketSizeSeconds) * bucketSizeSeconds;
  let bucketTrades: TokenTrade[] = [];

  sortedTrades.forEach(trade => {
    const tradeTime = Math.floor(trade.timestamp / 1000);
    if (tradeTime < currentBucket + bucketSizeSeconds) {
      bucketTrades.push(trade);
    } else {
      if (bucketTrades.length > 0) {
        const getPrice = (trade: TokenTrade) => trade.priceInUsd || fallbackPrice;
        candlesticks.push({
          time: currentBucket,
          open: getPrice(bucketTrades[0]),
          high: Math.max(...bucketTrades.map(t => getPrice(t))),
          low: Math.min(...bucketTrades.map(t => getPrice(t))),
          close: getPrice(bucketTrades[bucketTrades.length - 1]),
          volume: bucketTrades.reduce((sum, t) => sum + (t.tokenAmount || 0), 0)
        });
      }
      currentBucket = Math.floor(tradeTime / bucketSizeSeconds) * bucketSizeSeconds;
      bucketTrades = [trade];
    }
  });

  // Handle last bucket
  if (bucketTrades.length > 0) {
    const getPrice = (trade: TokenTrade) => trade.priceInUsd || fallbackPrice;
    candlesticks.push({
      time: currentBucket,
      open: getPrice(bucketTrades[0]),
      high: Math.max(...bucketTrades.map(t => getPrice(t))),
      low: Math.min(...bucketTrades.map(t => getPrice(t))),
      close: getPrice(bucketTrades[bucketTrades.length - 1]),
      volume: bucketTrades.reduce((sum, t) => sum + (t.tokenAmount || 0), 0)
    });
  }

  return candlesticks;
}
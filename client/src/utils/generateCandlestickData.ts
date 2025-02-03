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
  if (!trades || trades.length === 0) {
    return [];
  }

  // Sort trades by timestamp (oldest first)
  const sortedTrades = [...trades].sort((a, b) => a.timestamp - b.timestamp);
  const candlesticks: CandlestickData[] = [];
  let bucketStart = Math.floor(sortedTrades[0].timestamp / 1000 / bucketSizeSeconds) * bucketSizeSeconds;
  let bucketTrades: TokenTrade[] = [];

  const flushBucket = () => {
    if (bucketTrades.length === 0) return;
    const getPrice = (trade: TokenTrade) => trade.priceInUsd && trade.priceInUsd > 0 ? trade.priceInUsd : fallbackPrice;
    const open = getPrice(bucketTrades[0]);
    const close = getPrice(bucketTrades[bucketTrades.length - 1]);
    const high = Math.max(...bucketTrades.map(t => getPrice(t)));
    const low = Math.min(...bucketTrades.map(t => getPrice(t)));
    const volume = bucketTrades.reduce((sum, t) => sum + (t.tokenAmount || 0), 0);
    candlesticks.push({ time: bucketStart, open, high, low, close, volume });
  };

  for (const trade of sortedTrades) {
    const tradeTimeSec = Math.floor(trade.timestamp / 1000);
    if (tradeTimeSec < bucketStart + bucketSizeSeconds) {
      bucketTrades.push(trade);
    } else {
      flushBucket();
      bucketStart = Math.floor(tradeTimeSec / bucketSizeSeconds) * bucketSizeSeconds;
      bucketTrades = [trade];
    }
  }
  flushBucket();
  return candlesticks;
}

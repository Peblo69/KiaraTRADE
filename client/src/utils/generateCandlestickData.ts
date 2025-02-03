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
 * Groups an array of TokenTrade objects into candlestick data based on the given bucket size.
 * If no valid trade prices are found in a bucket and fallbackPrice is provided, it will use fallbackPrice.
 *
 * @param trades - The array of TokenTrade objects.
 * @param bucketSizeSeconds - The interval (in seconds) for each candle (default is 60 seconds).
 * @param fallbackPrice - Optional fallback price to use if no trade in a bucket has a valid price.
 * @returns An array of CandlestickData objects sorted by time.
 */
export function generateCandlestickData(
  trades: TokenTrade[],
  bucketSizeSeconds: number = 60
): CandlestickData[] {
  if (!trades || trades.length === 0) return [];

  const sortedTrades = [...trades].sort((a, b) => a.timestamp - b.timestamp);
  const candlesticks: CandlestickData[] = [];
  const buckets: { [bucket: number]: TokenTrade[] } = {};

  // Group trades directly by their price data
  sortedTrades.forEach(trade => {
    const bucketTime = Math.floor(trade.timestamp / 1000 / bucketSizeSeconds) * bucketSizeSeconds;
    if (!buckets[bucketTime]) {
      buckets[bucketTime] = [];
    }
    buckets[bucketTime].push(trade);
  });

  // Convert each bucket to a candlestick
  Object.entries(buckets).forEach(([bucketTime, bucketTrades]) => {
    const prices = bucketTrades.map(t => t.priceInUsd).filter(p => p > 0);
    if (prices.length === 0) return;
    
    const candlestick = {
      time: parseInt(bucketTime),
      open: prices[0],
      high: Math.max(...prices),
      low: Math.min(...prices),
      close: prices[prices.length - 1],
      volume: bucketTrades.reduce((sum, t) => sum + (t.tokenAmount || 0), 0)
    };
    candlesticks.push({
      time: parseInt(bucketTime),
      open,
      high,
      low,
      close,
      volume,
    });
  });

  return candlesticks.sort((a, b) => a.time - b.time);
}

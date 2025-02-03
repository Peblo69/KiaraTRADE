import { Trade } from '@/context/TradingContext';

export interface CandlestickData {
  time: number;  // Unix timestamp in seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export const generateCandlestickData = (trades: Trade[], bucketSizeSeconds: number, defaultPrice: number): CandlestickData[] => {
  if (!trades || trades.length === 0) {
    return [{
      time: Math.floor(Date.now() / 1000),
      open: defaultPrice,
      high: defaultPrice,
      low: defaultPrice,
      close: defaultPrice,
      volume: 0
    }];
  }

  // Group trades by time bucket
  const candleMap = new Map<number, {
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }>();

  // Sort trades by timestamp
  const sortedTrades = [...trades].sort((a, b) => a.timestamp - b.timestamp);

  sortedTrades.forEach(trade => {
    // Convert timestamp to bucket timestamp (floor to nearest bucket)
    const bucketTimestamp = Math.floor(trade.timestamp / 1000 / bucketSizeSeconds) * bucketSizeSeconds;
    const price = trade.price || defaultPrice;
    const volume = trade.amount || 0;

    const existingCandle = candleMap.get(bucketTimestamp);
    if (existingCandle) {
      // Update existing candle
      existingCandle.high = Math.max(existingCandle.high, price);
      existingCandle.low = Math.min(existingCandle.low, price);
      existingCandle.close = price;
      existingCandle.volume += volume;
    } else {
      // Create new candle
      candleMap.set(bucketTimestamp, {
        open: price,
        high: price,
        low: price,
        close: price,
        volume: volume
      });
    }
  });

  // Convert map to array and sort by timestamp
  return Array.from(candleMap.entries())
    .map(([timestamp, data]) => ({
      time: timestamp,
      ...data
    }))
    .sort((a, b) => a.time - b.time);
};
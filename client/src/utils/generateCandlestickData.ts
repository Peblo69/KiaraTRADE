import { Trade } from '@/context/TradingContext';

export interface CandlestickData {
  time: number;
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

  const candleMap = new Map<number, {
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    firstTimestamp: number;
  }>();

  // Sort trades by timestamp
  const sortedTrades = [...trades].sort((a, b) => a.timestamp - b.timestamp);

  sortedTrades.forEach(trade => {
    const bucketTimestamp = Math.floor(trade.timestamp / (bucketSizeSeconds * 1000)) * bucketSizeSeconds;
    const price = trade.price;
    const volume = trade.amount || 0;

    const existingCandle = candleMap.get(bucketTimestamp);
    if (existingCandle) {
      existingCandle.high = Math.max(existingCandle.high, price);
      existingCandle.low = Math.min(existingCandle.low, price);
      existingCandle.close = price;
      existingCandle.volume += volume;
    } else {
      candleMap.set(bucketTimestamp, {
        open: price,
        high: price,
        low: price,
        close: price,
        volume: volume,
        firstTimestamp: trade.timestamp
      });
    }
  });

  // Convert to array and sort by timestamp
  return Array.from(candleMap.entries())
    .map(([timestamp, data]) => ({
      time: timestamp,
      open: data.open,
      high: data.high,
      low: data.low,
      close: data.close,
      volume: data.volume
    }))
    .sort((a, b) => a.time - b.time);
};
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
  trades: any[],
  bucketSizeSeconds: number = 60
): CandlestickData[] {
  if (!trades || trades.length === 0) {
    console.log('No trades data available');
    return [];
  }

  console.log('Processing trades:', trades[0]); // Debug log

  const sortedTrades = [...trades].sort((a, b) => a.timestamp - b.timestamp);
  const candlesticks: CandlestickData[] = [];
  let currentBucket: { [key: number]: any[] } = {};

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

    // Handle both priceInUsd and priceInSol formats
    const prices = trades.map(t => {
      // Try to get price in different formats
      const price = t.priceInUsd || t.priceInSol || t.price || 0;
      return Number(price);
    }).filter(p => p > 0);

    if (prices.length === 0) return;

    const candle: CandlestickData = {
      time: parseInt(time),
      open: prices[0],
      high: Math.max(...prices),
      low: Math.min(...prices),
      close: prices[prices.length - 1],
      volume: trades.reduce((sum, t) => {
        const amount = t.tokenAmount || t.amount || t.volume || 0;
        return sum + Number(amount);
      }, 0)
    };

    console.log('Generated candle:', candle); // Debug log
    candlesticks.push(candle);
  });

  const sortedCandlesticks = candlesticks.sort((a, b) => a.time - b.time);
  console.log('Final candlesticks:', sortedCandlesticks); // Debug log
  return sortedCandlesticks;
}
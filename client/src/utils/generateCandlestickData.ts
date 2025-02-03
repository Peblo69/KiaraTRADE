import { TokenTrade } from '@/types/token';
import { Time } from 'lightweight-charts';

export interface CandlestickData {
  time: Time;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export function generateCandlestickData(
  trades: TokenTrade[],
  interval: number = 60, // Default 1 minute intervals
  fallbackPrice?: number
): CandlestickData[] {
  if (!trades || trades.length === 0) {
    if (fallbackPrice) {
      const currentTime = Math.floor(Date.now() / 1000);
      return [{
        time: currentTime as Time,
        open: fallbackPrice,
        high: fallbackPrice,
        low: fallbackPrice,
        close: fallbackPrice,
        volume: 0
      }];
    }
    return [];
  }

  // Normalize timestamps to interval boundaries
  const normalizedTrades = trades.map(trade => ({
    ...trade,
    timestamp: Math.floor(trade.timestamp / 1000 / interval) * interval
  }));

  // Group trades by time interval
  const tradesByInterval = normalizedTrades.reduce((acc, trade) => {
    if (!acc[trade.timestamp]) {
      acc[trade.timestamp] = [];
    }
    acc[trade.timestamp].push(trade);
    return acc;
  }, {} as Record<number, TokenTrade[]>);

  // Convert groups to candlesticks
  const candlesticks = Object.entries(tradesByInterval).map(([timestamp, trades]) => {
    const prices = trades.map(t => Number(t.priceInUsd || (t.solAmount / t.tokenAmount) || 0)).filter(p => p > 0);
    if (prices.length === 0 && fallbackPrice) {
      prices.push(fallbackPrice);
    }

    return {
      time: parseInt(timestamp) as Time,
      open: prices[0],
      high: Math.max(...prices),
      low: Math.min(...prices),
      close: prices[prices.length - 1],
      volume: trades.reduce((sum, t) => sum + Number(t.tokenAmount || 0), 0)
    };
  });

  // Add current price as latest candle if needed
  if (fallbackPrice) {
    const currentTime = Math.floor(Date.now() / 1000 / interval) * interval;
    const lastCandle = candlesticks[candlesticks.length - 1];

    if (!lastCandle || lastCandle.time < (currentTime as Time)) {
      candlesticks.push({
        time: currentTime as Time,
        open: fallbackPrice,
        high: fallbackPrice,
        low: fallbackPrice,
        close: fallbackPrice,
        volume: 0
      });
    } else if (lastCandle.time === currentTime) {
      lastCandle.close = fallbackPrice;
      lastCandle.high = Math.max(lastCandle.high, fallbackPrice);
      lastCandle.low = Math.min(lastCandle.low, fallbackPrice);
    }
  }

  return candlesticks.sort((a, b) => Number(a.time) - Number(b.time));
}
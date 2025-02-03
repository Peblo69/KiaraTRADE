import { useEffect, useState } from 'react';
import { useChartStore, initializeChartStore } from '@/lib/chart-websocket';

interface CandlestickData {
  time: number;  // Unix timestamp in seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface ChartData {
  candles: CandlestickData[];
  currentPrice: number;
}

const MINUTE = 60 * 1000; // milliseconds

export const useChartData = (tokenAddress: string): ChartData => {
  const [chartData, setChartData] = useState<ChartData>({
    candles: [],
    currentPrice: 0
  });

  // Initialize chart store subscription
  useEffect(() => {
    const unsubscribe = initializeChartStore(tokenAddress);
    return () => unsubscribe();
  }, [tokenAddress]);

  // Get trades from our specialized chart store
  const trades = useChartStore(state => state.getTradesForToken(tokenAddress));

  // Transform trades into candles
  useEffect(() => {
    if (!trades.length) return;

    const now = Date.now();
    const timeFrameStart = now - (60 * MINUTE); // Last 60 minutes

    // Filter recent trades
    const recentTrades = trades.filter(trade => trade.timestamp >= timeFrameStart);

    // Group trades by minute
    const candleMap = new Map<number, CandlestickData>();

    recentTrades.forEach(trade => {
      const minuteTimestamp = Math.floor(trade.timestamp / MINUTE) * MINUTE / 1000; // Convert to seconds

      if (!candleMap.has(minuteTimestamp)) {
        candleMap.set(minuteTimestamp, {
          time: minuteTimestamp,
          open: trade.priceInUsd,
          high: trade.priceInUsd,
          low: trade.priceInUsd,
          close: trade.priceInUsd,
          volume: trade.amount
        });
      } else {
        const candle = candleMap.get(minuteTimestamp)!;
        candle.high = Math.max(candle.high, trade.priceInUsd);
        candle.low = Math.min(candle.low, trade.priceInUsd);
        candle.close = trade.priceInUsd;
        candle.volume += trade.amount;
      }
    });

    // Convert map to sorted array
    const candles = Array.from(candleMap.values()).sort((a, b) => a.time - b.time);

    // If no candles but we have trades, create a single candle with latest price
    if (candles.length === 0 && trades.length > 0) {
      const latestTrade = trades[trades.length - 1];
      const currentTimestamp = Math.floor(now / MINUTE) * MINUTE / 1000;
      candles.push({
        time: currentTimestamp,
        open: latestTrade.priceInUsd,
        high: latestTrade.priceInUsd,
        low: latestTrade.priceInUsd,
        close: latestTrade.priceInUsd,
        volume: 0
      });
    }

    setChartData({
      candles,
      currentPrice: trades[trades.length - 1]?.priceInUsd || 0
    });
  }, [trades]);

  return chartData;
};
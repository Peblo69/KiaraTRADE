import { useState, useEffect } from 'react';
import { useChartStore, connectToPumpPortal } from '@/lib/chart-websocket';
import { CandlestickData, ChartData } from '@/lib/chart-types';

const MINUTE = 60 * 1000; // One minute in milliseconds

export const useChartData = (tokenAddress: string): ChartData => {
  const [chartData, setChartData] = useState<ChartData>({
    candles: [],
    currentPrice: 0
  });

  // Connect to PumpPortal
  useEffect(() => {
    console.log('Initializing chart data for token:', tokenAddress);
    const cleanup = connectToPumpPortal(tokenAddress);
    return cleanup;
  }, [tokenAddress]);

  // Get trades from our store
  const trades = useChartStore(state => state.getTradesForToken(tokenAddress));

  // Process trades into candles
  useEffect(() => {
    if (!trades.length) {
      console.log('No trades available for candlestick generation');
      return;
    }

    // Log incoming trade data
    console.log('Processing trades:', {
      count: trades.length,
      priceRange: {
        min: Math.min(...trades.map(t => t.priceInUsd)),
        max: Math.max(...trades.map(t => t.priceInUsd)),
        latest: trades[trades.length - 1].priceInUsd
      }
    });

    // Group trades by minute
    const candleMap = new Map<number, {
      time: number;
      open: number;
      high: number;
      low: number;
      close: number;
      volume: number;
      trades: number[];
    }>();

    trades.forEach(trade => {
      if (!trade.priceInUsd || trade.priceInUsd <= 0) {
        console.warn('Skipping trade with invalid price:', trade);
        return;
      }

      const minuteTimestamp = Math.floor(trade.timestamp / MINUTE) * MINUTE / 1000;

      if (!candleMap.has(minuteTimestamp)) {
        // Initialize new candle
        candleMap.set(minuteTimestamp, {
          time: minuteTimestamp,
          open: trade.priceInUsd,
          high: trade.priceInUsd,
          low: trade.priceInUsd,
          close: trade.priceInUsd,
          volume: trade.amount || 0,
          trades: [trade.priceInUsd]
        });
      } else {
        // Update existing candle
        const candle = candleMap.get(minuteTimestamp)!;
        candle.high = Math.max(candle.high, trade.priceInUsd);
        candle.low = Math.min(candle.low, trade.priceInUsd);
        candle.close = trade.priceInUsd;
        candle.volume += trade.amount || 0;
        candle.trades.push(trade.priceInUsd);
      }
    });

    // Convert to candlesticks
    const candles: CandlestickData[] = Array.from(candleMap.values())
      .map(({ time, open, high, low, close, volume }) => ({
        time,
        open,
        high,
        low,
        close,
        volume
      }))
      .sort((a, b) => a.time - b.time);

    // Log generated candles for verification
    if (candles.length > 0) {
      const lastCandle = candles[candles.length - 1];
      console.log('Candlestick data generated:', {
        totalCandles: candles.length,
        latestCandle: {
          time: new Date(lastCandle.time * 1000).toISOString(),
          open: lastCandle.open,
          high: lastCandle.high,
          low: lastCandle.low,
          close: lastCandle.close,
          volume: lastCandle.volume
        },
        priceRange: {
          min: Math.min(...candles.map(c => c.low)),
          max: Math.max(...candles.map(c => c.high))
        }
      });
    }

    setChartData({
      candles,
      currentPrice: trades[trades.length - 1].priceInUsd
    });
  }, [trades]);

  return chartData;
};
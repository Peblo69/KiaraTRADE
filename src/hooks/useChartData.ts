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

    // Log trade data for debugging
    const prices = trades.map(t => t.priceInUsd);
    console.log('Processing trades for candlesticks:', {
      tradeCount: trades.length,
      priceRange: {
        min: Math.min(...prices),
        max: Math.max(...prices),
        latest: prices[prices.length - 1]
      }
    });

    const candleMap = new Map<number, CandlestickData>();

    // Process each trade
    trades.forEach(trade => {
      // Skip trades with invalid prices
      if (!trade.priceInUsd || trade.priceInUsd <= 0) {
        console.warn('Skipping trade with invalid price:', trade);
        return;
      }

      // Convert timestamp to minute-level timestamp in seconds
      const minuteTimestamp = Math.floor(trade.timestamp / MINUTE) * MINUTE / 1000;

      if (!candleMap.has(minuteTimestamp)) {
        // Create new candle
        candleMap.set(minuteTimestamp, {
          time: minuteTimestamp,
          open: trade.priceInUsd,
          high: trade.priceInUsd,
          low: trade.priceInUsd,
          close: trade.priceInUsd,
          volume: trade.amount
        });
      } else {
        // Update existing candle
        const candle = candleMap.get(minuteTimestamp)!;
        candle.high = Math.max(candle.high, trade.priceInUsd);
        candle.low = Math.min(candle.low, trade.priceInUsd);
        candle.close = trade.priceInUsd;
        candle.volume += trade.amount;
      }
    });

    // Convert map to sorted array
    const candles = Array.from(candleMap.values())
      .sort((a, b) => a.time - b.time);

    // Log candlestick data for debugging
    if (candles.length > 0) {
      console.log('Generated candlesticks:', {
        candleCount: candles.length,
        firstCandle: candles[0],
        lastCandle: candles[candles.length - 1]
      });
    }

    setChartData({
      candles,
      currentPrice: trades[trades.length - 1].priceInUsd
    });
  }, [trades]);

  return chartData;
};
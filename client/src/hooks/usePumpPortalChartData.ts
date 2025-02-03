// src/hooks/usePumpPortalChartData.ts
import { useMemo } from 'react';
import { usePumpPortalStore } from '@/lib/pump-portal-websocket';
import { generateCandlestickData, CandlestickData } from '@/utils/generateCandlestickData';
import { Trade } from '@/context/TradingContext'; // Adjust the import path if needed

interface ChartData {
  candles: CandlestickData[];
  currentPrice: number;
}

const usePumpPortalChartData = (tokenAddress: string, bucketSizeSeconds: number = 60): ChartData => {
  // Get the token from your PumpPortal store (which should be updated by your WebSocket)
  const token = usePumpPortalStore(state => state.getToken(tokenAddress));

  return useMemo(() => {
    const fallbackPrice = token ? token.priceInUsd || 0 : 0;
    // Map token.recentTrades into a simplified trade format.
    // (Here we assume that each trade has priceInUsd, tokenAmount, and timestamp.)
    const trades: Trade[] = token?.recentTrades?.map(t => ({
      timestamp: t.timestamp,
      price: t.priceInUsd || fallbackPrice,
      amount: t.tokenAmount || 0,
      type: 'buy' // default value if side info is missing
    })) || [];

    const candles: CandlestickData[] =
      trades.length > 0
        ? generateCandlestickData(trades, bucketSizeSeconds, fallbackPrice)
        : [{
            time: Math.floor(Date.now() / 1000),
            open: fallbackPrice,
            high: fallbackPrice,
            low: fallbackPrice,
            close: fallbackPrice,
            volume: 0,
          }];

    return {
      candles,
      currentPrice: fallbackPrice
    };
  }, [token, bucketSizeSeconds]);
};

export default usePumpPortalChartData;

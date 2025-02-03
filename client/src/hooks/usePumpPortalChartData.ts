import { useMemo } from 'react';
import { usePumpPortalStore } from '@/lib/pump-portal-websocket';
import { generateCandlestickData, CandlestickData } from '@/utils/generateCandlestickData';
import { Trade } from '@/context/TradingContext';

interface ChartData {
  candles: CandlestickData[];
  currentPrice: number;
}

const usePumpPortalChartData = (tokenAddress: string, bucketSizeSeconds: number = 60): ChartData => {
  const token = usePumpPortalStore(state => state.getToken(tokenAddress));

  return useMemo(() => {
    const fallbackPrice = token?.priceInUsd || 0;
    const trades: Trade[] = token?.recentTrades?.map(t => ({
      timestamp: t.timestamp,
      price: t.priceInUsd || fallbackPrice,
      amount: t.tokenAmount || 0,
      type: 'buy' as const // Default to buy since we don't have side information
    })) || [];

    const candles = trades.length > 0
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
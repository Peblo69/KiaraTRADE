// client/src/utils/generateCandlestickData.ts
import { TokenTrade } from '@/types/token';

export interface CandlestickData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export function generateCandlestickData(trades: TokenTrade[], interval = 60000): CandlestickData[] { // 1-minute candles by default
  if (!trades || trades.length === 0) return [];

  const candles: CandlestickData[] = [];
  let currentCandle: CandlestickData | null = null;

  trades.forEach(trade => {
    const candleTime = Math.floor(trade.timestamp / interval) * interval;

    if (!currentCandle || currentCandle.time !== candleTime) {
      if (currentCandle) {
        candles.push(currentCandle);
      }
      currentCandle = {
        time: candleTime,
        open: trade.priceInUsd,
        high: trade.priceInUsd,
        low: trade.priceInUsd,
        close: trade.priceInUsd,
        volume: trade.tokenAmount || 0
      };
    } else {
      currentCandle.high = Math.max(currentCandle.high, trade.priceInUsd);
      currentCandle.low = Math.min(currentCandle.low, trade.priceInUsd);
      currentCandle.close = trade.priceInUsd;
      currentCandle.volume += trade.tokenAmount || 0;
    }
  });

  if (currentCandle) {
    candles.push(currentCandle);
  }

  return candles;
}
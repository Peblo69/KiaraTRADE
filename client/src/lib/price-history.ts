import { create } from 'zustand';

// Supported timeframes in milliseconds
export const TIMEFRAMES = {
  '1m': 60 * 1000,
  '5m': 5 * 60 * 1000,
  '15m': 15 * 60 * 1000,
  '1h': 60 * 60 * 1000,
  '4h': 4 * 60 * 60 * 1000,
  '1d': 24 * 60 * 60 * 1000
} as const;

export type TimeframeKey = keyof typeof TIMEFRAMES;

interface CandleData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  marketCap: number;
  trades: number;
}

interface TokenData {
  candles: Record<TimeframeKey, CandleData[]>;
  lastUpdate: number;
}

interface PriceHistoryState {
  data: Record<string, TokenData>;
  initialized: Set<string>;
  getPriceHistory: (tokenAddress: string, timeframe: TimeframeKey) => CandleData[];
  initializePriceHistory: (tokenAddress: string, initialPrice: number, marketCap: number) => void;
  addPricePoint: (tokenAddress: string, price: number, marketCap: number, volume: number) => void;
}

const MAX_CANDLES = 1000;

export const useTokenPriceStore = create<PriceHistoryState>()((set, get) => ({
  data: {},
  initialized: new Set(),

  getPriceHistory: (tokenAddress, timeframe) => {
    return get().data[tokenAddress]?.candles[timeframe] || [];
  },

  initializePriceHistory: (tokenAddress, initialPrice, marketCap) => {
    const state = get();
    if (state.initialized.has(tokenAddress)) return;

    const now = Date.now();
    const candles: Record<TimeframeKey, CandleData[]> = {};

    // Initialize candles for each timeframe
    Object.entries(TIMEFRAMES).forEach(([timeframe, interval]) => {
      const candleTime = Math.floor(now / interval) * interval;
      candles[timeframe as TimeframeKey] = [{
        timestamp: candleTime,
        open: initialPrice,
        high: initialPrice,
        low: initialPrice,
        close: initialPrice,
        volume: 0,
        marketCap,
        trades: 0
      }];
    });

    set(state => ({
      data: {
        ...state.data,
        [tokenAddress]: {
          candles,
          lastUpdate: now
        }
      },
      initialized: new Set([...state.initialized, tokenAddress])
    }));
  },

  addPricePoint: (tokenAddress, price, marketCap, volume) => {
    set(state => {
      if (!state.initialized.has(tokenAddress)) return state;

      const tokenData = state.data[tokenAddress];
      if (!tokenData) return state;

      const now = Date.now();
      const updatedCandles = { ...tokenData.candles };

      // Update candles for each timeframe
      Object.entries(TIMEFRAMES).forEach(([timeframe, interval]) => {
        const tf = timeframe as TimeframeKey;
        const candleTime = Math.floor(now / interval) * interval;
        const currentCandles = [...updatedCandles[tf]];
        const lastCandle = currentCandles[currentCandles.length - 1];

        if (lastCandle && lastCandle.timestamp === candleTime) {
          // Update existing candle
          currentCandles[currentCandles.length - 1] = {
            ...lastCandle,
            high: Math.max(lastCandle.high, price),
            low: Math.min(lastCandle.low, price),
            close: price,
            volume: lastCandle.volume + volume,
            marketCap,
            trades: lastCandle.trades + 1
          };
        } else {
          // Create new candle
          currentCandles.push({
            timestamp: candleTime,
            open: price,
            high: price,
            low: price,
            close: price,
            volume,
            marketCap,
            trades: 1
          });

          // Trim history if needed
          if (currentCandles.length > MAX_CANDLES) {
            currentCandles.splice(0, currentCandles.length - MAX_CANDLES);
          }
        }

        updatedCandles[tf] = currentCandles;
      });

      return {
        ...state,
        data: {
          ...state.data,
          [tokenAddress]: {
            candles: updatedCandles,
            lastUpdate: now
          }
        }
      };
    });
  }
}));
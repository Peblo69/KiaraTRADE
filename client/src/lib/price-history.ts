import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

// Supported timeframes in milliseconds
export const TIMEFRAMES = {
  '1m': 60 * 1000,
  '5m': 5 * 60 * 1000,
  '15m': 15 * 60 * 1000,
  '1h': 60 * 60 * 1000,
  '4h': 4 * 60 * 60 * 1000,
  '1d': 24 * 60 * 60 * 1000
} as const;

type TimeframeKey = keyof typeof TIMEFRAMES;

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

interface PriceHistoryState {
  // Store price history data
  data: Record<string, Record<TimeframeKey, CandleData[]>>;
  // Track initialization per token (not per timeframe)
  initialized: Set<string>;
  // Methods
  getPriceHistory: (tokenAddress: string, timeframe: TimeframeKey) => CandleData[];
  initializePriceHistory: (tokenAddress: string, initialPrice: number, marketCap: number) => void;
  addPricePoint: (tokenAddress: string, price: number, marketCap: number, volume: number) => void;
}

const MAX_CANDLES = 1000;

export const useTokenPriceStore = create<PriceHistoryState>((set, get) => ({
  data: {},
  initialized: new Set(),

  getPriceHistory: (tokenAddress, timeframe) => {
    const state = get();
    return state.data[tokenAddress]?.[timeframe] || [];
  },

  initializePriceHistory: (tokenAddress, initialPrice, marketCap) => {
    const state = get();

    // Skip if already initialized
    if (state.initialized.has(tokenAddress)) {
      return;
    }

    const now = Date.now();
    const initialData: Record<TimeframeKey, CandleData[]> = {} as Record<TimeframeKey, CandleData[]>;

    // Initialize with a single candle for each timeframe
    Object.entries(TIMEFRAMES).forEach(([timeframe, interval]) => {
      const candleTime = Math.floor(now / interval) * interval;
      initialData[timeframe as TimeframeKey] = [{
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
        [tokenAddress]: initialData
      },
      initialized: new Set([...state.initialized, tokenAddress])
    }));
  },

  addPricePoint: (tokenAddress, price, marketCap, volume) => {
    set(state => {
      // Skip if token not initialized
      if (!state.initialized.has(tokenAddress)) {
        return state;
      }

      const now = Date.now();
      const newData = { ...state.data };
      const tokenData = newData[tokenAddress];

      if (!tokenData) return state;

      // Update candles for each timeframe
      Object.entries(TIMEFRAMES).forEach(([timeframe, interval]) => {
        const tf = timeframe as TimeframeKey;
        const candleTime = Math.floor(now / interval) * interval;
        const candles = [...tokenData[tf]];
        const lastCandle = candles[candles.length - 1];

        if (lastCandle && lastCandle.timestamp === candleTime) {
          // Update existing candle
          lastCandle.high = Math.max(lastCandle.high, price);
          lastCandle.low = Math.min(lastCandle.low, price);
          lastCandle.close = price;
          lastCandle.volume += volume;
          lastCandle.marketCap = marketCap;
          lastCandle.trades += 1;
        } else {
          // Create new candle
          candles.push({
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
          if (candles.length > MAX_CANDLES) {
            candles.splice(0, candles.length - MAX_CANDLES);
          }
        }

        tokenData[tf] = candles;
      });

      return { ...state, data: newData };
    });
  }
}));
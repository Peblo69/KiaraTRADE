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

interface PriceHistoryState {
  data: Map<string, Map<TimeframeKey, CandleData[]>>;
  initialized: Set<string>;
  getPriceHistory: (tokenAddress: string, timeframe: TimeframeKey) => CandleData[];
  initializePriceHistory: (tokenAddress: string, initialPrice: number, marketCap: number) => void;
  addPricePoint: (tokenAddress: string, price: number, marketCap: number, volume: number) => void;
}

const MAX_CANDLES = 1000;

export const useTokenPriceStore = create<PriceHistoryState>()((set, get) => ({
  data: new Map(),
  initialized: new Set(),

  getPriceHistory: (tokenAddress, timeframe) => {
    const tokenData = get().data.get(tokenAddress);
    return tokenData?.get(timeframe) || [];
  },

  initializePriceHistory: (tokenAddress, initialPrice, marketCap) => {
    const state = get();

    // Skip if already initialized
    if (state.initialized.has(tokenAddress)) return;

    const now = Date.now();
    const newTokenData = new Map<TimeframeKey, CandleData[]>();

    // Initialize candles for each timeframe
    Object.entries(TIMEFRAMES).forEach(([timeframe, interval]) => {
      const candleTime = Math.floor(now / interval) * interval;
      const initialCandle: CandleData = {
        timestamp: candleTime,
        open: initialPrice,
        high: initialPrice,
        low: initialPrice,
        close: initialPrice,
        volume: 0,
        marketCap,
        trades: 0
      };
      newTokenData.set(timeframe as TimeframeKey, [initialCandle]);
    });

    set(state => {
      const newData = new Map(state.data);
      newData.set(tokenAddress, newTokenData);
      return {
        data: newData,
        initialized: new Set([...state.initialized, tokenAddress])
      };
    });
  },

  addPricePoint: (tokenAddress, price, marketCap, volume) => {
    set(state => {
      if (!state.initialized.has(tokenAddress)) return state;

      const tokenData = state.data.get(tokenAddress);
      if (!tokenData) return state;

      const now = Date.now();
      const newTokenData = new Map(tokenData);

      // Update candles for each timeframe
      Object.entries(TIMEFRAMES).forEach(([timeframe, interval]) => {
        const tf = timeframe as TimeframeKey;
        const candleTime = Math.floor(now / interval) * interval;
        const candles = [...(tokenData.get(tf) || [])];
        const lastCandle = candles[candles.length - 1];

        if (lastCandle && lastCandle.timestamp === candleTime) {
          // Update existing candle
          const updatedCandle = {
            ...lastCandle,
            high: Math.max(lastCandle.high, price),
            low: Math.min(lastCandle.low, price),
            close: price,
            volume: lastCandle.volume + volume,
            marketCap,
            trades: lastCandle.trades + 1
          };
          candles[candles.length - 1] = updatedCandle;
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

        newTokenData.set(tf, candles);
      });

      const newData = new Map(state.data);
      newData.set(tokenAddress, newTokenData);

      return { ...state, data: newData };
    });
  }
}));
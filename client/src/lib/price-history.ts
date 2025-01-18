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
  data: Map<string, CandleData[]>;
  initialized: Set<string>;
  getPriceHistory: (tokenAddress: string) => CandleData[] | undefined;
  initializePriceHistory: (tokenAddress: string, initialPrice: number, marketCap: number) => void;
  addPricePoint: (tokenAddress: string, price: number, marketCap: number, volume: number) => void;
}

const MAX_CANDLES = 1000;

export const useTokenPriceStore = create<PriceHistoryState>()((set, get) => ({
  data: new Map(),
  initialized: new Set(),

  getPriceHistory: (tokenAddress) => {
    return get().data.get(tokenAddress);
  },

  initializePriceHistory: (tokenAddress, initialPrice, marketCap) => {
    const state = get();

    // Skip if already initialized
    if (state.initialized.has(tokenAddress)) return;

    // Create initial candle
    const initialCandle: CandleData = {
      timestamp: Math.floor(Date.now() / (5 * 60 * 1000)) * (5 * 60 * 1000), // 5min default
      open: initialPrice,
      high: initialPrice,
      low: initialPrice,
      close: initialPrice,
      volume: 0,
      marketCap,
      trades: 0
    };

    // Update state immutably
    set((state) => {
      const newData = new Map(state.data);
      newData.set(tokenAddress, [initialCandle]);
      const newInitialized = new Set(state.initialized);
      newInitialized.add(tokenAddress);

      return {
        data: newData,
        initialized: newInitialized
      };
    });
  },

  addPricePoint: (tokenAddress, price, marketCap, volume) => {
    set((state) => {
      // Skip if not initialized
      if (!state.initialized.has(tokenAddress)) return state;

      const existingData = state.data.get(tokenAddress);
      if (!existingData) return state;

      const now = Date.now();
      const candleTime = Math.floor(now / (5 * 60 * 1000)) * (5 * 60 * 1000);
      const lastCandle = existingData[existingData.length - 1];

      let newCandles = [...existingData];

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
        newCandles[newCandles.length - 1] = updatedCandle;
      } else {
        // Create new candle
        newCandles.push({
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
        if (newCandles.length > MAX_CANDLES) {
          newCandles = newCandles.slice(-MAX_CANDLES);
        }
      }

      // Update state immutably
      const newData = new Map(state.data);
      newData.set(tokenAddress, newCandles);

      return { ...state, data: newData };
    });
  }
}));
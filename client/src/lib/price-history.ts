import { create } from 'zustand';

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
  getPriceHistory: (tokenAddress: string) => CandleData[];
  initializePriceHistory: (tokenAddress: string, initialPrice: number, marketCap: number) => void;
  addPricePoint: (tokenAddress: string, price: number, marketCap: number, volume: number) => void;
}

const MAX_CANDLES = 1000;
const TIMEFRAME = 5 * 60 * 1000; // Fixed 5min timeframe

export const useTokenPriceStore = create<PriceHistoryState>()((set, get) => ({
  data: new Map(),
  initialized: new Set(),

  getPriceHistory: (tokenAddress) => {
    console.log(`[PriceStore] Getting price history for token: ${tokenAddress}`);
    return get().data.get(tokenAddress) || [];
  },

  initializePriceHistory: (tokenAddress, initialPrice, marketCap) => {
    console.log(`[PriceStore] Initializing price history for token: ${tokenAddress}`);
    const state = get();
    if (state.initialized.has(tokenAddress)) {
      console.log(`[PriceStore] Token ${tokenAddress} already initialized, skipping`);
      return;
    }

    const now = Date.now();
    const candleTime = Math.floor(now / TIMEFRAME) * TIMEFRAME;

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

    set(state => {
      console.log(`[PriceStore] Setting initial candle for token: ${tokenAddress}`);
      const newData = new Map(state.data);
      newData.set(tokenAddress, [initialCandle]);
      return {
        data: newData,
        initialized: new Set([...state.initialized, tokenAddress])
      };
    });
  },

  addPricePoint: (tokenAddress, price, marketCap, volume) => {
    console.log(`[PriceStore] Adding price point for token: ${tokenAddress}, price: ${price}`);
    set(state => {
      if (!state.initialized.has(tokenAddress)) {
        console.log(`[PriceStore] Token ${tokenAddress} not initialized, skipping price update`);
        return state;
      }

      const existingData = state.data.get(tokenAddress);
      if (!existingData) {
        console.log(`[PriceStore] No existing data for token ${tokenAddress}, skipping price update`);
        return state;
      }

      const now = Date.now();
      const candleTime = Math.floor(now / TIMEFRAME) * TIMEFRAME;
      const lastCandle = existingData[existingData.length - 1];

      let newCandles = [...existingData];

      if (lastCandle && lastCandle.timestamp === candleTime) {
        // Update existing candle
        console.log(`[PriceStore] Updating existing candle for token: ${tokenAddress}`);
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
        console.log(`[PriceStore] Creating new candle for token: ${tokenAddress}`);
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

      const newData = new Map(state.data);
      newData.set(tokenAddress, newCandles);

      return { ...state, data: newData };
    });
  }
}));
import { create } from 'zustand';

interface CandleData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  marketCap: number;
}

interface TokenPriceState {
  priceHistory: Record<string, CandleData[]>;
  currentCandles: Record<string, CandleData>;
  addPricePoint: (tokenAddress: string, price: number, marketCap: number, volume: number) => void;
  getPriceHistory: (tokenAddress: string) => CandleData[];
  initializePriceHistory: (tokenAddress: string, initialPrice: number, marketCap: number) => void;
}

const CANDLE_INTERVAL = 5 * 60 * 1000; // 5 minutes per candle

export const useTokenPriceStore = create<TokenPriceState>((set, get) => ({
  priceHistory: {},
  currentCandles: {},

  addPricePoint: (tokenAddress: string, price: number, marketCap: number, volume: number) => {
    set((state) => {
      const currentTime = Date.now();
      const candleTime = Math.floor(currentTime / CANDLE_INTERVAL) * CANDLE_INTERVAL;

      const currentCandle = state.currentCandles[tokenAddress] || {
        timestamp: candleTime,
        open: price,
        high: price,
        low: price,
        close: price,
        volume: volume,
        marketCap: marketCap
      };

      // Update current candle
      if (candleTime === currentCandle.timestamp) {
        currentCandle.high = Math.max(currentCandle.high, price);
        currentCandle.low = Math.min(currentCandle.low, price);
        currentCandle.close = price;
        currentCandle.volume += volume;
        currentCandle.marketCap = marketCap; // Latest market cap
      } else {
        // Start new candle
        const tokenHistory = state.priceHistory[tokenAddress] || [];
        const newHistory = [
          ...tokenHistory,
          currentCandle
        ].slice(-288); // Keep 24 hours of 5-min candles

        return {
          priceHistory: {
            ...state.priceHistory,
            [tokenAddress]: newHistory,
          },
          currentCandles: {
            ...state.currentCandles,
            [tokenAddress]: {
              timestamp: candleTime,
              open: price,
              high: price,
              low: price,
              close: price,
              volume: volume,
              marketCap: marketCap
            }
          }
        };
      }

      return {
        ...state,
        currentCandles: {
          ...state.currentCandles,
          [tokenAddress]: currentCandle
        }
      };
    });
  },

  getPriceHistory: (tokenAddress: string) => {
    const state = get();
    const history = state.priceHistory[tokenAddress] || [];
    const currentCandle = state.currentCandles[tokenAddress];
    return currentCandle ? [...history, currentCandle] : history;
  },

  initializePriceHistory: (tokenAddress: string, initialPrice: number, marketCap: number) => {
    set((state) => {
      if (state.priceHistory[tokenAddress]?.length > 0) {
        return state;
      }

      const currentTime = Date.now();
      const candleTime = Math.floor(currentTime / CANDLE_INTERVAL) * CANDLE_INTERVAL;

      return {
        priceHistory: {
          ...state.priceHistory,
          [tokenAddress]: [],
        },
        currentCandles: {
          ...state.currentCandles,
          [tokenAddress]: {
            timestamp: candleTime,
            open: initialPrice,
            high: initialPrice,
            low: initialPrice,
            close: initialPrice,
            volume: 0,
            marketCap: marketCap
          }
        }
      };
    });
  },
}));
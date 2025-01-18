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

type Timeframe = keyof typeof TIMEFRAMES;

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
  priceHistory: Record<string, Record<Timeframe, CandleData[]>>;
  initialized: Record<string, Record<Timeframe, boolean>>;
  getPriceHistory: (tokenAddress: string, timeframe: Timeframe) => CandleData[];
  addPricePoint: (
    tokenAddress: string,
    price: number,
    marketCap: number,
    volume: number,
    timestamp?: number
  ) => void;
  initializePriceHistory: (
    tokenAddress: string,
    initialPrice: number,
    marketCap: number,
    timestamp?: number
  ) => void;
}

// Keep max 1000 candles per timeframe
const MAX_CANDLES = 1000;

export const useTokenPriceStore = create<PriceHistoryState>()(
  devtools(
    (set, get) => ({
      priceHistory: {},
      initialized: {},

      getPriceHistory: (tokenAddress: string, timeframe: Timeframe) => {
        const state = get();
        return state.priceHistory[tokenAddress]?.[timeframe] || [];
      },

      addPricePoint: (
        tokenAddress: string,
        price: number,
        marketCap: number,
        volume: number,
        timestamp = Date.now()
      ) => {
        set((state) => {
          const newState = { ...state };

          if (!newState.priceHistory[tokenAddress]) {
            return state; // Skip if not initialized
          }

          Object.entries(TIMEFRAMES).forEach(([timeframe, interval]) => {
            const tf = timeframe as Timeframe;
            const candleTime = Math.floor(timestamp / interval) * interval;
            const candles = newState.priceHistory[tokenAddress][tf];

            if (!candles) return;

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

              // Trim history
              if (candles.length > MAX_CANDLES) {
                newState.priceHistory[tokenAddress][tf] = candles.slice(-MAX_CANDLES);
              }
            }
          });

          return newState;
        });
      },

      initializePriceHistory: (
        tokenAddress: string,
        initialPrice: number,
        marketCap: number,
        timestamp = Date.now()
      ) => {
        set((state) => {
          // Skip if already initialized
          if (state.initialized[tokenAddress]) {
            return state;
          }

          const newPriceHistory: Record<Timeframe, CandleData[]> = {} as Record<Timeframe, CandleData[]>;

          // Initialize empty arrays for all timeframes
          Object.entries(TIMEFRAMES).forEach(([timeframe]) => {
            const tf = timeframe as Timeframe;
            newPriceHistory[tf] = [{
              timestamp: Math.floor(timestamp / TIMEFRAMES[tf]) * TIMEFRAMES[tf],
              open: initialPrice,
              high: initialPrice,
              low: initialPrice,
              close: initialPrice,
              volume: 0,
              marketCap,
              trades: 0
            }];
          });

          return {
            ...state,
            priceHistory: {
              ...state.priceHistory,
              [tokenAddress]: newPriceHistory
            },
            initialized: {
              ...state.initialized,
              [tokenAddress]: true
            }
          };
        });
      }
    }),
    { name: 'token-price-store' }
  )
);
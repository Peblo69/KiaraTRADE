import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

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
const UPDATE_DEBOUNCE = 1000; // 1 second debounce
const updateQueue: Record<string, NodeJS.Timeout> = {};

export const useTokenPriceStore = create<TokenPriceState>()(
  devtools(
    (set, get) => ({
      priceHistory: {},
      currentCandles: {},

      addPricePoint: (tokenAddress: string, price: number, marketCap: number, volume: number) => {
        // Clear existing timeout
        if (updateQueue[tokenAddress]) {
          clearTimeout(updateQueue[tokenAddress]);
        }

        // Debounce the update
        updateQueue[tokenAddress] = setTimeout(() => {
          set((state) => {
            const currentTime = Date.now();
            const candleTime = Math.floor(currentTime / CANDLE_INTERVAL) * CANDLE_INTERVAL;
            const currentCandle = state.currentCandles[tokenAddress];

            if (!currentCandle || candleTime !== currentCandle.timestamp) {
              // Start a new candle
              const newCandle = {
                timestamp: candleTime,
                open: price,
                high: price,
                low: price,
                close: price,
                volume: volume,
                marketCap: marketCap
              };

              const tokenHistory = state.priceHistory[tokenAddress] || [];
              if (currentCandle) {
                tokenHistory.push(currentCandle);
              }

              return {
                priceHistory: {
                  ...state.priceHistory,
                  [tokenAddress]: tokenHistory.slice(-288), // Keep 24 hours
                },
                currentCandles: {
                  ...state.currentCandles,
                  [tokenAddress]: newCandle
                }
              };
            }

            // Update existing candle
            const updatedCandle = {
              ...currentCandle,
              high: Math.max(currentCandle.high, price),
              low: Math.min(currentCandle.low, price),
              close: price,
              volume: currentCandle.volume + volume,
              marketCap: marketCap
            };

            return {
              ...state,
              currentCandles: {
                ...state.currentCandles,
                [tokenAddress]: updatedCandle
              }
            };
          });
        }, UPDATE_DEBOUNCE);
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
    }),
    { name: 'token-price-store' }
  )
);
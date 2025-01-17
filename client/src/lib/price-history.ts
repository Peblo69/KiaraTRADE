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
const UPDATE_BATCH_SIZE = 5; // Number of updates to batch
const UPDATE_DEBOUNCE = 2000; // 2 seconds debounce

const batchUpdates: Record<string, { price: number; marketCap: number; volume: number }[]> = {};
const updateTimeouts: Record<string, NodeJS.Timeout> = {};

export const useTokenPriceStore = create<TokenPriceState>()(
  devtools(
    (set, get) => ({
      priceHistory: {},
      currentCandles: {},

      addPricePoint: (tokenAddress: string, price: number, marketCap: number, volume: number) => {
        // Add update to batch
        if (!batchUpdates[tokenAddress]) {
          batchUpdates[tokenAddress] = [];
        }
        batchUpdates[tokenAddress].push({ price, marketCap, volume });

        // Clear existing timeout
        if (updateTimeouts[tokenAddress]) {
          clearTimeout(updateTimeouts[tokenAddress]);
        }

        // Process batch if it reaches the threshold or after debounce
        if (batchUpdates[tokenAddress].length >= UPDATE_BATCH_SIZE) {
          processUpdate(tokenAddress, set);
        } else {
          updateTimeouts[tokenAddress] = setTimeout(() => {
            processUpdate(tokenAddress, set);
          }, UPDATE_DEBOUNCE);
        }
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

function processUpdate(tokenAddress: string, set: any) {
  const updates = batchUpdates[tokenAddress];
  if (!updates || updates.length === 0) return;

  const lastUpdate = updates[updates.length - 1];
  const totalVolume = updates.reduce((sum, update) => sum + update.volume, 0);
  const highPrice = Math.max(...updates.map(u => u.price));
  const lowPrice = Math.min(...updates.map(u => u.price));

  set((state: TokenPriceState) => {
    const currentTime = Date.now();
    const candleTime = Math.floor(currentTime / CANDLE_INTERVAL) * CANDLE_INTERVAL;
    const currentCandle = state.currentCandles[tokenAddress];

    if (!currentCandle || candleTime !== currentCandle.timestamp) {
      // Start a new candle
      const newCandle = {
        timestamp: candleTime,
        open: updates[0].price,
        high: highPrice,
        low: lowPrice,
        close: lastUpdate.price,
        volume: totalVolume,
        marketCap: lastUpdate.marketCap
      };

      const tokenHistory = state.priceHistory[tokenAddress] || [];
      if (currentCandle) {
        tokenHistory.push(currentCandle);
      }

      // Clear the batch
      batchUpdates[tokenAddress] = [];

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
      high: Math.max(currentCandle.high, highPrice),
      low: Math.min(currentCandle.low, lowPrice),
      close: lastUpdate.price,
      volume: currentCandle.volume + totalVolume,
      marketCap: lastUpdate.marketCap
    };

    // Clear the batch
    batchUpdates[tokenAddress] = [];

    return {
      ...state,
      currentCandles: {
        ...state.currentCandles,
        [tokenAddress]: updatedCandle
      }
    };
  });
}
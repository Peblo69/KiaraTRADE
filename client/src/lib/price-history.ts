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

interface TokenPriceState {
  // Store candles for each timeframe for each token
  candlesByTimeframe: Record<string, Record<Timeframe, CandleData[]>>;
  // Store current (incomplete) candles
  currentCandles: Record<string, Record<Timeframe, CandleData>>;
  // Methods
  addPricePoint: (
    tokenAddress: string, 
    price: number, 
    marketCap: number, 
    volume: number,
    timestamp?: number
  ) => void;
  getPriceHistory: (tokenAddress: string, timeframe: Timeframe) => CandleData[];
  initializePriceHistory: (
    tokenAddress: string, 
    initialPrice: number, 
    marketCap: number,
    timestamp?: number
  ) => void;
}

// Keep max 1000 candles per timeframe
const MAX_CANDLES = 1000;

// Update batching configuration
const UPDATE_BATCH_SIZE = 5;
const UPDATE_DEBOUNCE = 2000;

const batchUpdates: Record<string, Array<{
  price: number;
  marketCap: number;
  volume: number;
  timestamp: number;
}>> = {};

const updateTimeouts: Record<string, NodeJS.Timeout> = {};

export const useTokenPriceStore = create<TokenPriceState>()(
  devtools(
    (set, get) => ({
      candlesByTimeframe: {},
      currentCandles: {},

      addPricePoint: (
        tokenAddress: string,
        price: number,
        marketCap: number,
        volume: number,
        timestamp = Date.now()
      ) => {
        if (!batchUpdates[tokenAddress]) {
          batchUpdates[tokenAddress] = [];
        }

        batchUpdates[tokenAddress].push({
          price,
          marketCap,
          volume,
          timestamp
        });

        if (updateTimeouts[tokenAddress]) {
          clearTimeout(updateTimeouts[tokenAddress]);
        }

        if (batchUpdates[tokenAddress].length >= UPDATE_BATCH_SIZE) {
          processUpdates(tokenAddress, set, get);
        } else {
          updateTimeouts[tokenAddress] = setTimeout(() => {
            processUpdates(tokenAddress, set, get);
          }, UPDATE_DEBOUNCE);
        }
      },

      getPriceHistory: (tokenAddress: string, timeframe: Timeframe) => {
        const state = get();
        const history = state.candlesByTimeframe[tokenAddress]?.[timeframe] || [];
        const currentCandle = state.currentCandles[tokenAddress]?.[timeframe];
        return currentCandle ? [...history, currentCandle] : history;
      },

      initializePriceHistory: (
        tokenAddress: string,
        initialPrice: number,
        marketCap: number,
        timestamp = Date.now()
      ) => {
        set((state) => {
          if (state.candlesByTimeframe[tokenAddress]) {
            return state;
          }

          const newCandles: Record<Timeframe, CandleData> = {} as Record<Timeframe, CandleData>;

          // Initialize current candles for all timeframes
          Object.entries(TIMEFRAMES).forEach(([timeframe, interval]) => {
            const candleTime = Math.floor(timestamp / interval) * interval;
            newCandles[timeframe as Timeframe] = {
              timestamp: candleTime,
              open: initialPrice,
              high: initialPrice,
              low: initialPrice,
              close: initialPrice,
              volume: 0,
              marketCap,
              trades: 0
            };
          });

          return {
            candlesByTimeframe: {
              ...state.candlesByTimeframe,
              [tokenAddress]: Object.fromEntries(
                Object.keys(TIMEFRAMES).map(tf => [tf, []])
              )
            },
            currentCandles: {
              ...state.currentCandles,
              [tokenAddress]: newCandles
            }
          };
        });
      },
    }),
    { name: 'token-price-store' }
  )
);

function processUpdates(
  tokenAddress: string,
  set: any,
  get: any
) {
  const updates = batchUpdates[tokenAddress];
  if (!updates?.length) return;

  // Sort updates by timestamp
  updates.sort((a, b) => a.timestamp - b.timestamp);

  set((state: TokenPriceState) => {
    const newState = { ...state };
    const tokenCandles = newState.currentCandles[tokenAddress];
    if (!tokenCandles) return newState;

    // Process updates for each timeframe
    Object.entries(TIMEFRAMES).forEach(([timeframe, interval]) => {
      const tf = timeframe as Timeframe;
      const currentCandle = tokenCandles[tf];

      updates.forEach(update => {
        const candleTime = Math.floor(update.timestamp / interval) * interval;

        // If update belongs to a new candle
        if (candleTime !== currentCandle.timestamp) {
          // Save current candle to history
          if (!newState.candlesByTimeframe[tokenAddress][tf]) {
            newState.candlesByTimeframe[tokenAddress][tf] = [];
          }
          newState.candlesByTimeframe[tokenAddress][tf].push(currentCandle);

          // Trim history to keep only MAX_CANDLES
          if (newState.candlesByTimeframe[tokenAddress][tf].length > MAX_CANDLES) {
            newState.candlesByTimeframe[tokenAddress][tf] = 
              newState.candlesByTimeframe[tokenAddress][tf].slice(-MAX_CANDLES);
          }

          // Start new candle
          tokenCandles[tf] = {
            timestamp: candleTime,
            open: update.price,
            high: update.price,
            low: update.price,
            close: update.price,
            volume: update.volume,
            marketCap: update.marketCap,
            trades: 1
          };
        } else {
          // Update current candle
          tokenCandles[tf] = {
            ...tokenCandles[tf],
            high: Math.max(tokenCandles[tf].high, update.price),
            low: Math.min(tokenCandles[tf].low, update.price),
            close: update.price,
            volume: tokenCandles[tf].volume + update.volume,
            marketCap: update.marketCap,
            trades: tokenCandles[tf].trades + 1
          };
        }
      });
    });

    // Clear processed updates
    batchUpdates[tokenAddress] = [];

    return newState;
  });
}
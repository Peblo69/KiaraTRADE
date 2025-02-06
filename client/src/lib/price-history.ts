import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

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
  vwap?: number;
  isPending?: boolean;
}

interface TokenPriceData {
  [timeframe: string]: CandleData[];
}

interface PriceHistoryState {
  priceHistory: Record<string, TokenPriceData>;
  initialized: Set<string>;
  lastUpdate: Record<string, number>;
  errors: Record<string, string>;

  getPriceHistory: (tokenAddress: string, timeframe: TimeframeKey) => CandleData[];
  initializePriceHistory: (tokenAddress: string, initialPrice: number, marketCap: number, timestamp?: number) => void;
  addPricePoint: (tokenAddress: string, price: number, marketCap: number, volume: number, timestamp?: number) => void;
  getVWAP: (tokenAddress: string, timeframe: TimeframeKey) => number;
  clearHistory: (tokenAddress: string) => void;
}

const MAX_CANDLES = 1000;
const CLEANUP_INTERVAL = 24 * 60 * 60 * 1000;

export const useTokenPriceStore = create<PriceHistoryState>()(
  devtools(
    (set, get) => ({
      priceHistory: {},
      initialized: new Set(),
      lastUpdate: {},
      errors: {},

      getPriceHistory: (tokenAddress, timeframe) => {
        const state = get();
        return state.priceHistory[tokenAddress]?.[timeframe] || [];
      },

      initializePriceHistory: (tokenAddress, initialPrice, marketCap, timestamp = Date.now()) => {
        if (!tokenAddress || typeof initialPrice !== 'number' || typeof marketCap !== 'number') {
          set(state => ({
            errors: {
              ...state.errors,
              [tokenAddress]: 'Invalid initialization parameters'
            }
          }));
          return;
        }

        const state = get();
        if (state.initialized.has(tokenAddress)) return;

        const initialData: TokenPriceData = {} as TokenPriceData;

        Object.entries(TIMEFRAMES).forEach(([timeframe, interval]) => {
          const candleTime = Math.floor(timestamp / interval) * interval;
          initialData[timeframe] = [{
            timestamp: candleTime,
            open: initialPrice,
            high: initialPrice,
            low: initialPrice,
            close: initialPrice,
            volume: 0,
            marketCap,
            trades: 0,
            vwap: initialPrice,
            isPending: false
          }];
        });

        set(state => ({
          priceHistory: {
            ...state.priceHistory,
            [tokenAddress]: initialData
          },
          initialized: new Set([...state.initialized, tokenAddress]),
          lastUpdate: {
            ...state.lastUpdate,
            [tokenAddress]: timestamp
          }
        }));
      },

      addPricePoint: (tokenAddress, price, marketCap, volume, timestamp = Date.now()) => {
        if (!tokenAddress || typeof price !== 'number' || typeof marketCap !== 'number') {
          set(state => ({
            errors: {
              ...state.errors,
              [tokenAddress]: 'Invalid price point parameters'
            }
          }));
          return;
        }

        set(state => {
          if (!state.initialized.has(tokenAddress)) return state;

          const newPriceHistory = { ...state.priceHistory };
          const tokenData = newPriceHistory[tokenAddress] || {};

          Object.entries(TIMEFRAMES).forEach(([timeframe, interval]) => {
            const tf = timeframe as TimeframeKey;
            const candleTime = Math.floor(timestamp / interval) * interval;
            const candles = [...(tokenData[tf] || [])];
            const lastCandle = candles[candles.length - 1];

            if (lastCandle && lastCandle.timestamp === candleTime) {
              const updatedVolume = lastCandle.volume + volume;
              const updatedTrades = lastCandle.trades + 1;
              const vwap = ((lastCandle.vwap || lastCandle.close) * lastCandle.volume + price * volume) / updatedVolume;

              const updatedCandle: CandleData = {
                ...lastCandle,
                high: Math.max(lastCandle.high, price),
                low: Math.min(lastCandle.low, price),
                close: price,
                volume: updatedVolume,
                marketCap,
                trades: updatedTrades,
                vwap,
                isPending: timestamp > candleTime + interval
              };
              candles[candles.length - 1] = updatedCandle;
            } else {
              candles.push({
                timestamp: candleTime,
                open: price,
                high: price,
                low: price,
                close: price,
                volume,
                marketCap,
                trades: 1,
                vwap: price,
                isPending: false
              });

              if (candles.length > MAX_CANDLES) {
                candles.splice(0, candles.length - MAX_CANDLES);
              }
            }

            tokenData[tf] = candles;
          });

          const now = Date.now();
          if (now - (state.lastUpdate[tokenAddress] || 0) > CLEANUP_INTERVAL) {
            Object.keys(state.priceHistory).forEach(addr => {
              if (now - (state.lastUpdate[addr] || 0) > CLEANUP_INTERVAL) {
                delete newPriceHistory[addr];
                state.initialized.delete(addr);
              }
            });
          }

          newPriceHistory[tokenAddress] = tokenData;

          return {
            ...state,
            priceHistory: newPriceHistory,
            lastUpdate: {
              ...state.lastUpdate,
              [tokenAddress]: timestamp
            }
          };
        });
      },

      getVWAP: (tokenAddress, timeframe) => {
        const candles = get().getPriceHistory(tokenAddress, timeframe);
        if (!candles.length) return 0;
        const lastCandle = candles[candles.length - 1];
        return lastCandle.vwap || lastCandle.close;
      },

      clearHistory: (tokenAddress) => {
        set(state => {
          const newState = { ...state };
          delete newState.priceHistory[tokenAddress];
          newState.initialized.delete(tokenAddress);
          delete newState.lastUpdate[tokenAddress];
          delete newState.errors[tokenAddress];
          return newState;
        });
      }
    }),
    { name: 'token-price-store' }
  )
);
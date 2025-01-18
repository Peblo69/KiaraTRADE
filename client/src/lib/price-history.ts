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
  priceHistory: Record<string, Record<TimeframeKey, CandleData[]>>;
  initialized: Set<string>;
  getPriceHistory: (tokenAddress: string, timeframe: TimeframeKey) => CandleData[];
  initializePriceHistory: (tokenAddress: string, initialPrice: number, marketCap: number) => void;
  addPricePoint: (tokenAddress: string, price: number, marketCap: number, volume: number) => void;
}

const MAX_CANDLES = 1000;

export const useTokenPriceStore = create<PriceHistoryState>()((set, get) => ({
  priceHistory: {},
  initialized: new Set(),

  getPriceHistory: (tokenAddress, timeframe) => {
    const state = get();
    return state.priceHistory[tokenAddress]?.[timeframe] || [];
  },

  initializePriceHistory: (tokenAddress, initialPrice, marketCap) => {
    const state = get();

    // Skip if already initialized
    if (state.initialized.has(tokenAddress)) return;

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
      priceHistory: {
        ...state.priceHistory,
        [tokenAddress]: initialData
      },
      initialized: new Set([...state.initialized, tokenAddress])
    }));
  },

  addPricePoint: (tokenAddress, price, marketCap, volume) => {
    set(state => {
      // Skip if not initialized
      if (!state.initialized.has(tokenAddress)) return state;

      const now = Date.now();
      const newPriceHistory = { ...state.priceHistory };
      const tokenData = { ...newPriceHistory[tokenAddress] };

      // Update candles for each timeframe
      Object.entries(TIMEFRAMES).forEach(([timeframe, interval]) => {
        const tf = timeframe as TimeframeKey;
        const candleTime = Math.floor(now / interval) * interval;
        const candles = [...(tokenData[tf] || [])];
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

        tokenData[tf] = candles;
      });

      newPriceHistory[tokenAddress] = tokenData;
      return { ...state, priceHistory: newPriceHistory };
    });
  }
}));
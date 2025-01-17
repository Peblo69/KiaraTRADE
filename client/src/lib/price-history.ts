import { create } from 'zustand';

interface PricePoint {
  timestamp: number;
  price: number;
}

interface TokenPriceState {
  priceHistory: Record<string, PricePoint[]>;
  addPricePoint: (tokenAddress: string, price: number) => void;
  getPriceHistory: (tokenAddress: string) => PricePoint[];
  initializePriceHistory: (tokenAddress: string, initialPrice: number) => void;
}

export const useTokenPriceStore = create<TokenPriceState>((set, get) => ({
  priceHistory: {},

  addPricePoint: (tokenAddress: string, price: number) => {
    set((state) => {
      const currentTime = Date.now();
      const tokenHistory = state.priceHistory[tokenAddress] || [];

      // Add new price point
      const newHistory = [...tokenHistory, { timestamp: currentTime, price }];

      // Keep only last 24 hours of data
      const twentyFourHoursAgo = currentTime - 24 * 60 * 60 * 1000;
      const filteredHistory = newHistory.filter(point => point.timestamp >= twentyFourHoursAgo);

      // Sort by timestamp
      filteredHistory.sort((a, b) => a.timestamp - b.timestamp);

      return {
        priceHistory: {
          ...state.priceHistory,
          [tokenAddress]: filteredHistory,
        },
      };
    });
  },

  getPriceHistory: (tokenAddress: string) => {
    const state = get();
    return state.priceHistory[tokenAddress] || [];
  },

  initializePriceHistory: (tokenAddress: string, initialPrice: number) => {
    set((state) => {
      if (state.priceHistory[tokenAddress]?.length > 0) {
        return state;
      }

      const currentTime = Date.now();
      const mockHistory = Array.from({ length: 24 }, (_, i) => ({
        timestamp: currentTime - (23 - i) * 3600000,
        price: initialPrice * (1 + (Math.random() * 0.4 - 0.2)) // Add some random variation
      }));

      return {
        priceHistory: {
          ...state.priceHistory,
          [tokenAddress]: mockHistory,
        },
      };
    });
  },
}));

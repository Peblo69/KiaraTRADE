import { create } from 'zustand';

interface VolumeData {
  timestamp: number;
  volume: number;
  price: number;
  buyVolume: number;
  sellVolume: number;
}

interface TokenVolumeState {
  volumeData: Record<string, VolumeData[]>;
  addVolumeData: (tokenAddress: string, amount: number, price: number, isBuy: boolean) => void;
  getVolumeHistory: (tokenAddress: string) => VolumeData[];
  updateVolume24h: (tokenAddress: string, volume: number, price: number) => void;
}

export const useTokenVolumeStore = create<TokenVolumeState>((set, get) => ({
  volumeData: {},

  addVolumeData: (tokenAddress: string, amount: number, price: number, isBuy: boolean) => {
    set((state) => {
      const currentTime = Date.now();
      const tokenData = state.volumeData[tokenAddress] || [];

      // Calculate new price based on buy/sell pressure
      const lastPrice = tokenData.length > 0 ? tokenData[tokenData.length - 1].price : price;
      const priceImpact = amount * (isBuy ? 0.01 : -0.01); // 1% price impact per volume unit
      const newPrice = lastPrice * (1 + priceImpact);

      // Add new volume data point
      const newData = [...tokenData, {
        timestamp: currentTime,
        volume: amount,
        price: newPrice,
        buyVolume: isBuy ? amount : 0,
        sellVolume: !isBuy ? amount : 0
      }];

      // Keep only last 24 hours of data
      const twentyFourHoursAgo = currentTime - 24 * 60 * 60 * 1000;
      const filteredData = newData.filter(data => data.timestamp >= twentyFourHoursAgo);

      // Sort data by timestamp
      filteredData.sort((a, b) => a.timestamp - b.timestamp);

      return {
        volumeData: {
          ...state.volumeData,
          [tokenAddress]: filteredData,
        },
      };
    });
  },

  getVolumeHistory: (tokenAddress: string) => {
    const state = get();
    return state.volumeData[tokenAddress] || [];
  },

  updateVolume24h: (tokenAddress: string, volume: number, price: number) => {
    set((state) => {
      const currentData = state.volumeData[tokenAddress] || [];
      const currentTime = Date.now();

      // If there's no data, create initial data points
      if (currentData.length === 0) {
        const initialData = Array.from({ length: 24 }, (_, i) => ({
          timestamp: currentTime - (23 - i) * 3600000,
          volume: volume / 24,
          price: price,
          buyVolume: (volume / 24) * 0.6, // Assume 60% buys
          sellVolume: (volume / 24) * 0.4 // Assume 40% sells
        }));

        return {
          volumeData: {
            ...state.volumeData,
            [tokenAddress]: initialData,
          },
        };
      }

      return state;
    });
  },
}));
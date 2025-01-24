import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface TokenData {
  address: string;
  name: string;
  symbol: string;
  price: number;
  marketCap: number;
  volume24h: number;
  imageUrl?: string;
}

interface UnifiedTokenStore {
  tokens: TokenData[];
  isConnected: boolean;
  connectionError: string | null;
  setConnected: (status: boolean) => void;
  setError: (error: string | null) => void;
}

export const useUnifiedTokenStore = create<UnifiedTokenStore>()(
  persist(
    (set) => ({
      tokens: [],
      isConnected: false,
      connectionError: null,
      setConnected: (status) => set({ isConnected: status }),
      setError: (error) => set({ connectionError: error }),
    }),
    {
      name: 'unified-token-store', // unique name
      storage: createJSONStorage(() => localStorage),
    }
  )
);
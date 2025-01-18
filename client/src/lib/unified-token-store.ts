import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

export interface TokenData {
  address: string;
  name: string;
  symbol: string;
  price: number;
  volume24h: number;
  marketCap: number;
  imageUrl?: string;
  timestamp: number;
}

interface TokenStore {
  tokens: Map<string, TokenData>;
  isConnected: boolean;
  lastUpdate: number;
  error: string | null;

  // Actions
  addToken: (token: TokenData) => void;
  updateToken: (address: string, data: Partial<TokenData>) => void;
  setConnected: (status: boolean) => void;
  setError: (error: string | null) => void;
  clearTokens: () => void;
}

export const useTokenStore = create<TokenStore>()(
  devtools(
    (set) => ({
      tokens: new Map(),
      isConnected: false,
      lastUpdate: 0,
      error: null,

      addToken: (token) => set((state) => {
        const newTokens = new Map(state.tokens);
        newTokens.set(token.address, {
          ...token,
          timestamp: Date.now()
        });
        return { 
          tokens: newTokens,
          lastUpdate: Date.now()
        };
      }),

      updateToken: (address, data) => set((state) => {
        const newTokens = new Map(state.tokens);
        const existingToken = newTokens.get(address);
        if (existingToken) {
          newTokens.set(address, {
            ...existingToken,
            ...data,
            timestamp: Date.now()
          });
        }
        return { 
          tokens: newTokens,
          lastUpdate: Date.now()
        };
      }),

      clearTokens: () => set({ tokens: new Map(), lastUpdate: Date.now() }),
      setConnected: (status) => set({ isConnected: status, error: null }),
      setError: (error) => set({ error, isConnected: false })
    }),
    { name: 'token-store' }
  )
);
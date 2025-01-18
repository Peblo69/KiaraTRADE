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
}

export const useTokenStore = create<TokenStore>()(
  devtools(
    (set, get) => ({
      tokens: new Map(),
      isConnected: false,
      lastUpdate: 0,
      error: null,

      addToken: (token) => {
        const now = Date.now();
        // Rate limit: Only update if more than 1 second has passed
        if (now - get().lastUpdate < 1000) return;

        set((state) => {
          const newTokens = new Map(state.tokens);
          newTokens.set(token.address, {
            ...token,
            timestamp: now
          });
          return { 
            tokens: newTokens,
            lastUpdate: now
          };
        });
      },

      updateToken: (address, data) => {
        const now = Date.now();
        // Rate limit: Only update if more than 1 second has passed
        if (now - get().lastUpdate < 1000) return;

        set((state) => {
          const newTokens = new Map(state.tokens);
          const existingToken = newTokens.get(address);
          if (existingToken) {
            newTokens.set(address, {
              ...existingToken,
              ...data,
              timestamp: now
            });
          }
          return { 
            tokens: newTokens,
            lastUpdate: now
          };
        });
      },

      setConnected: (status) => set({ isConnected: status, error: null }),
      setError: (error) => set({ error, isConnected: false })
    }),
    { name: 'token-store' }
  )
);
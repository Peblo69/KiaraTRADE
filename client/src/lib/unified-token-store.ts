import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface TokenData {
  symbol: string;
  price: number;
  marketCap: number;
  volume24h: number;
  imageUrl?: string;
  mint?: string;
}

interface UnifiedTokenStore {
  tokens: Map<string, TokenData>;
  addToken: (tokenData: TokenData) => void;
  updateToken: (symbol: string, updates: Partial<TokenData>) => void;
  removeToken: (symbol: string) => void;
}

export const useUnifiedTokenStore = create<UnifiedTokenStore>()(
  persist(
    (set) => ({
      tokens: new Map(),
      addToken: (tokenData) =>
        set((state) => ({
          tokens: new Map(state.tokens).set(tokenData.symbol, tokenData),
        })),
      updateToken: (symbol, updates) =>
        set((state) => {
          const tokens = new Map(state.tokens);
          const existing = tokens.get(symbol);
          if (existing) {
            tokens.set(symbol, { ...existing, ...updates });
          }
          return { tokens };
        }),
      removeToken: (symbol) =>
        set((state) => {
          const tokens = new Map(state.tokens);
          tokens.delete(symbol);
          return { tokens };
        }),
    }),
    {
      name: 'unified-token-store',
    }
  )
);
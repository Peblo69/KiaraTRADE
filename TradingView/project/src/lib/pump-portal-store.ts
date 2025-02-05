import { create } from "zustand";
import { persist } from "zustand/middleware";

// Constants
const MAX_TOKENS = 50; // Limit the number of tokens to store
const MAX_TRADES = 100; // Limit trade history per token
const SYNC_DEBOUNCE = 1000; // 1 second debounce for syncing
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache

export interface TokenMetadata {
  name: string;
  symbol: string;
  decimals: number;
  uri?: string;
  mint?: string;
  imageUrl?: string;
  creators?: Array<{
    address: string;
    verified: boolean;
    share: number;
  }>;
}

export interface TokenTrade {
  signature: string;
  timestamp: number;
  mint: string;
  txType: "buy" | "sell";
  tokenAmount: number;
  solAmount: number;
  traderPublicKey: string;
  counterpartyPublicKey: string;
  bondingCurveKey: string;
  vTokensInBondingCurve: number;
  vSolInBondingCurve: number;
  marketCapSol: number;
  priceInSol: number;
  priceInUsd: number;
  isDevTrade?: boolean;
}

export interface PumpPortalToken {
  symbol: string;
  name: string;
  address: string;
  bondingCurveKey: string;
  vTokensInBondingCurve: number;
  vSolInBondingCurve: number;
  marketCapSol: number;
  priceInSol?: number;
  priceInUsd?: number;
  devWallet?: string;
  recentTrades: TokenTrade[];
  metadata?: TokenMetadata;
  lastAnalyzedAt?: string;
  analyzedBy?: string;
  createdAt?: string;
  volume24h?: number;
  riskMetrics?: any;
  isNew?: boolean;
  website?: string | null;
  twitter?: string | null;
  telegram?: string | null;
  imageUrl?: string;
  lastUpdated?: number;
}

interface PumpPortalStore {
  tokens: PumpPortalToken[];
  isConnected: boolean;
  solPrice: number;
  addToken: (token: PumpPortalToken) => void;
  updateToken: (address: string, token: Partial<PumpPortalToken>) => void;
  getToken: (address: string) => PumpPortalToken | undefined;
  setSolPrice: (price: number) => void;
  addTradeToHistory: (address: string, trade: TokenTrade) => void;
}

// Create store with persist middleware and performance optimizations
export const usePumpPortalStore = create<PumpPortalStore>()(
  persist(
    (set, get) => ({
      tokens: [],
      isConnected: false,
      solPrice: 0,

      addToken: (token) =>
        set((state) => {
          const existingIndex = state.tokens.findIndex(t => t.address === token.address);
          const now = Date.now();

          if (existingIndex > -1) {
            // Update existing token
            const updatedTokens = [...state.tokens];
            updatedTokens[existingIndex] = {
              ...updatedTokens[existingIndex],
              ...token,
              lastUpdated: now
            };
            return { tokens: updatedTokens };
          }

          // Add new token
          return {
            tokens: [
              { ...token, lastUpdated: now },
              ...state.tokens
            ].slice(0, MAX_TOKENS)
          };
        }),

      updateToken: (address, updates) =>
        set((state) => ({
          tokens: state.tokens.map((t) =>
            t.address === address 
              ? { ...t, ...updates, lastUpdated: Date.now() }
              : t
          ),
        })),

      getToken: (address) => {
        const token = get().tokens.find((t) => t.address === address);
        if (!token) return undefined;

        // Check if data is stale
        const isStale = Date.now() - (token.lastUpdated || 0) > CACHE_DURATION;
        if (isStale) {
          // Return stale data but trigger background update
          setTimeout(() => {
            const originalStore = (window as any).pumpPortalStore;
            if (originalStore) {
              const freshToken = originalStore.getState().tokens.find(
                (t: any) => t.address === address
              );
              if (freshToken) {
                get().updateToken(address, freshToken);
              }
            }
          }, 0);
        }

        return token;
      },

      setSolPrice: (price) => set({ solPrice: price }),

      addTradeToHistory: (address, trade) =>
        set((state) => ({
          tokens: state.tokens.map((t) =>
            t.address === address
              ? {
                  ...t,
                  recentTrades: [trade, ...(t.recentTrades || [])].slice(0, MAX_TRADES),
                  lastUpdated: Date.now()
                }
              : t
          ),
        })),
    }),
    {
      name: "pump-portal-storage",
      storage: {
        getItem: (name) => {
          try {
            const item = localStorage.getItem(name);
            return item ? JSON.parse(item) : null;
          } catch (error) {
            console.error('Storage error:', error);
            return null;
          }
        },
        setItem: (name, value) => {
          try {
            localStorage.setItem(name, JSON.stringify(value));
          } catch (error) {
            console.error('Storage error:', error);
          }
        },
        removeItem: (name) => localStorage.removeItem(name),
      },
    }
  )
);

// Efficient data sync with debouncing
let syncTimeout: NodeJS.Timeout | null = null;
let pendingUpdates: PumpPortalToken[] = [];

// Subscribe to the original pump-portal-websocket store
if (typeof window !== "undefined") {
  const originalStore = (window as any).pumpPortalStore;
  if (originalStore) {
    originalStore.subscribe((state: any) => {
      if (syncTimeout) clearTimeout(syncTimeout);

      // Collect updates
      if (state.tokens) {
        pendingUpdates = [...pendingUpdates, ...state.tokens];
      }

      // Debounce updates
      syncTimeout = setTimeout(() => {
        if (pendingUpdates.length > 0) {
          // Batch update tokens
          const store = usePumpPortalStore.getState();
          const uniqueTokens = Array.from(
            new Map(pendingUpdates.map(token => [token.address, token])).values()
          );
          uniqueTokens.slice(0, MAX_TOKENS).forEach(token => {
            store.addToken(token);
          });
          pendingUpdates = [];
        }

        if (state.solPrice) {
          usePumpPortalStore.getState().setSolPrice(state.solPrice);
        }
      }, SYNC_DEBOUNCE);
    });
  }
}

export default usePumpPortalStore;
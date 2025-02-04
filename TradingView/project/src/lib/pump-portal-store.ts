import { create } from "zustand";
import { persist } from "zustand/middleware";

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

// Create store with persist middleware
export const usePumpPortalStore = create<PumpPortalStore>()(
  persist(
    (set, get) => ({
      tokens: [],
      isConnected: false,
      solPrice: 0,

      addToken: (token) =>
        set((state) => ({
          tokens: [
            token,
            ...state.tokens.filter((t) => t.address !== token.address),
          ],
        })),

      updateToken: (address, updates) =>
        set((state) => ({
          tokens: state.tokens.map((t) =>
            t.address === address ? { ...t, ...updates } : t
          ),
        })),

      getToken: (address) => get().tokens.find((t) => t.address === address),

      setSolPrice: (price) => set({ solPrice: price }),

      addTradeToHistory: (address, trade) =>
        set((state) => ({
          tokens: state.tokens.map((t) =>
            t.address === address
              ? {
                  ...t,
                  recentTrades: [trade, ...(t.recentTrades || [])].slice(0, 1000),
                }
              : t
          ),
        })),
    }),
    {
      name: "pump-portal-storage",
      storage: {
        getItem: (name) => {
          const item = localStorage.getItem(name);
          return item ? JSON.parse(item) : null;
        },
        setItem: (name, value) => {
          localStorage.setItem(name, JSON.stringify(value));
        },
        removeItem: (name) => localStorage.removeItem(name),
      },
    }
  )
);

// Subscribe to the original pump-portal-websocket store
// to sync data with our local store
if (typeof window !== "undefined") {
  const originalStore = (window as any).pumpPortalStore;
  if (originalStore) {
    originalStore.subscribe((state: any) => {
      if (state.tokens) {
        state.tokens.forEach((token: PumpPortalToken) => {
          usePumpPortalStore.getState().addToken(token);
        });
      }
      if (state.solPrice) {
        usePumpPortalStore.getState().setSolPrice(state.solPrice);
      }
    });
  }
}

export default usePumpPortalStore;
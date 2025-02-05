import { create } from "zustand";
import { persist } from "zustand/middleware";
import { format } from "date-fns";

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
  viewedTokens: { [key: string]: PumpPortalToken };
  isConnected: boolean;
  solPrice: number;
  activeTokenView: string | null;
  currentTime: string;
  currentUser: string;
  addToken: (tokenData: any) => void;
  addTradeToHistory: (address: string, tradeData: TokenTrade) => void;
  setConnected: (connected: boolean) => void;
  setSolPrice: (price: number) => void;
  resetTokens: () => void;
  addToViewedTokens: (address: string) => void;
  setActiveTokenView: (address: string | null) => void;
  getToken: (address: string) => PumpPortalToken | undefined;
  updateTokenPrice: (address: string, priceInUsd: number) => void;
}

const createJSONStorage = (getStorage: () => Storage) => ({
  getItem: (name: string) => {
    try {
      const serializedState = getStorage().getItem(name);
      return serializedState ? JSON.parse(serializedState) : undefined;
    } catch (error) {
      console.error("Error retrieving item from storage:", error);
      return undefined;
    }
  },
  setItem: (name: string, state: any) => {
    try {
      const serializedState = JSON.stringify(state);
      getStorage().setItem(name, serializedState);
    } catch (error) {
      console.error("Error storing item in storage:", error);
    }
  },
  removeItem: (name: string) => getStorage().removeItem(name),
});

// Helper function to safely get token address
const getTokenAddress = (tokenData: any): string => {
  return tokenData?.mint || tokenData?.address || '';
};

// Helper function to safely get token metadata
const getTokenMetadata = (tokenData: any): TokenMetadata => {
  const address = getTokenAddress(tokenData);
  return {
    name: tokenData?.name || `Token ${address.slice(0, 8)}`,
    symbol: tokenData?.symbol || address.slice(0, 6).toUpperCase(),
    decimals: tokenData?.decimals || 9,
    mint: address,
    uri: tokenData?.uri || '',
    imageUrl: tokenData?.imageUrl,
    creators: tokenData?.creators || [],
  };
};

// Placeholder functions -  Replace with actual implementations
const calculateVolumeMetrics = (trades: TokenTrade[]): { volume24h: number } => ({ volume24h: 0 });
const calculateTokenRisk = (token: PumpPortalToken): any => ({});


export const usePumpPortalStore = create(
  persist<PumpPortalStore>(
    (set, get) => ({
      tokens: [],
      viewedTokens: {},
      isConnected: false,
      solPrice: 0,
      activeTokenView: null,
      currentTime: format(new Date(), "yyyy-MM-dd HH:mm:ss"),
      currentUser: "Peblo69",

      addToken: (tokenData) => {
        if (!tokenData) return;

        const address = getTokenAddress(tokenData);
        if (!address) return;

        set((state) => {
          const metadata = getTokenMetadata(tokenData);
          const newToken: PumpPortalToken = {
            symbol: metadata.symbol,
            name: metadata.name,
            address,
            bondingCurveKey: tokenData?.bondingCurveKey || '',
            vTokensInBondingCurve: tokenData?.vTokensInBondingCurve || 0,
            vSolInBondingCurve: tokenData?.vSolInBondingCurve || 0,
            marketCapSol: tokenData?.marketCapSol || 0,
            priceInSol: tokenData?.priceInSol || 0,
            priceInUsd: tokenData?.priceInUsd || 0,
            devWallet: tokenData?.devWallet || tokenData?.traderPublicKey,
            recentTrades: [],
            metadata,
            lastAnalyzedAt: tokenData?.timestamp?.toString(),
            createdAt: tokenData?.timestamp?.toString(),
            website: tokenData?.website || null,
            twitter: tokenData?.twitter || null,
            telegram: tokenData?.telegram || null,
            imageUrl: tokenData?.imageUrl,
            lastUpdated: Date.now(),
          };

          const existingTokenIndex = state.tokens.findIndex(
            (t) => t.address === address
          );

          if (existingTokenIndex >= 0) {
            const updatedTokens = [...state.tokens];
            updatedTokens[existingTokenIndex] = {
              ...updatedTokens[existingTokenIndex],
              ...newToken,
              recentTrades: updatedTokens[existingTokenIndex].recentTrades,
            };

            return { tokens: updatedTokens };
          }

          return {
            tokens: [newToken, ...state.tokens].slice(0, MAX_TOKENS),
          };
        });
      },

      addTradeToHistory: (address: string, tradeData: TokenTrade) =>
        set((state) => {
          const tokenIndex = state.tokens.findIndex((t) => t.address === address);
          if (tokenIndex === -1) return state;

          const updatedTokens = [...state.tokens];
          const token = updatedTokens[tokenIndex];

          const updatedTrades = [tradeData, ...token.recentTrades].slice(
            0,
            MAX_TRADES
          );

          const volumeMetrics = calculateVolumeMetrics(updatedTrades);

          updatedTokens[tokenIndex] = {
            ...token,
            recentTrades: updatedTrades,
            volume24h: volumeMetrics.volume24h,
            riskMetrics: calculateTokenRisk({
              ...token,
              recentTrades: updatedTrades,
            }),
            lastUpdated: Date.now(),
          };

          return { tokens: updatedTokens };
        }),

      setConnected: (connected) => set({ isConnected: connected }),
      setSolPrice: (price) => set({ solPrice: price }),
      resetTokens: () => set({ tokens: [], viewedTokens: {}, activeTokenView: null }),
      addToViewedTokens: (address) => set((state) => {
        const token = state.tokens.find((t) => t.address === address);
        return token
          ? { viewedTokens: { ...state.viewedTokens, [address]: token } }
          : state;
      }),

      setActiveTokenView: (address) => set({ activeTokenView: address }),
      getToken: (address) => {
        if (!address) return undefined;
        return get().tokens.find((t) => t.address === address);
      },
      updateTokenPrice: (address: string, priceInUsd: number) =>
        set((state) => {
          if (!address) return state;

          const tokenIndex = state.tokens.findIndex((t) => t.address === address);
          if (tokenIndex === -1) return state;

          const updatedTokens = [...state.tokens];
          updatedTokens[tokenIndex] = {
            ...updatedTokens[tokenIndex],
            priceInUsd,
            priceInSol: state.solPrice > 0 ? priceInUsd / state.solPrice : 0,
            lastUpdated: Date.now(),
          };

          return { tokens: updatedTokens };
        }),
    }),
    {
      name: "pump-portal-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        tokens: state.tokens.map((token) => ({
          ...token,
          recentTrades: token.recentTrades.slice(0, MAX_TRADES),
        })),
        viewedTokens: state.viewedTokens,
      }),
    }
  )
);

export default usePumpPortalStore;
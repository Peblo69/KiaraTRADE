import { create } from "zustand";
import { persist } from "zustand/middleware";
import { format } from "date-fns";
import {
  calculatePumpFunTokenMetrics,
  calculateVolumeMetrics,
  calculateTokenRisk,
} from "@/utils/token-calculations";

const MAX_TRADES_PER_TOKEN = 100; // Reduced max trades for better performance
const MAX_TOKENS_IN_LIST = 50;
const DEBUG = false;

function debugLog(action: string, data?: any) {
  if (DEBUG) {
    console.log(`[PumpPortal][${action}]`, data || "");
  }
}

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

      addToken: (tokenData) =>
        set((state) => {
          debugLog("addToken", tokenData);

          const tokenMetrics = calculatePumpFunTokenMetrics({
            vSolInBondingCurve: tokenData.vSolInBondingCurve || 0,
            vTokensInBondingCurve: tokenData.vTokensInBondingCurve || 0,
            solPrice: state.solPrice,
          });

          const newToken = {
            symbol: tokenData.symbol || tokenData.mint?.slice(0, 6).toUpperCase(),
            name: tokenData.name || `Token ${tokenData.mint?.slice(0, 8)}`,
            address: tokenData.mint || tokenData.address,
            bondingCurveKey: tokenData.bondingCurveKey || "",
            vTokensInBondingCurve: tokenData.vTokensInBondingCurve || 0,
            vSolInBondingCurve: tokenData.vSolInBondingCurve || 0,
            marketCapSol: tokenMetrics.marketCap.sol,
            priceInSol: tokenMetrics.price.sol,
            priceInUsd: tokenMetrics.price.usd,
            devWallet: tokenData.devWallet || tokenData.traderPublicKey,
            recentTrades: [],
            metadata: {
              name: tokenData.name || `Token ${tokenData.mint?.slice(0, 8)}`,
              symbol: tokenData.symbol || tokenData.mint?.slice(0, 6).toUpperCase(),
              decimals: tokenData.decimals || 9,
              mint: tokenData.mint,
              uri: tokenData.uri || "",
              imageUrl: tokenData.imageUrl,
              creators: tokenData.creators || [],
            },
            lastAnalyzedAt: tokenData.timestamp?.toString(),
            createdAt: tokenData.timestamp?.toString(),
            website: tokenData.website || null,
            twitter: tokenData.twitter || null,
            telegram: tokenData.telegram || null,
            imageUrl: tokenData.imageUrl,
            lastUpdated: Date.now(),
          };

          const existingTokenIndex = state.tokens.findIndex(
            (t) => t.address === newToken.address
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
            tokens: [newToken, ...state.tokens].slice(0, MAX_TOKENS_IN_LIST),
          };
        }),

      addTradeToHistory: (address: string, tradeData: TokenTrade) =>
        set((state) => {
          debugLog("addTradeToHistory", {
            token: address,
            type: tradeData.txType,
            amount: tradeData.solAmount,
          });

          const tokenIndex = state.tokens.findIndex((t) => t.address === address);
          if (tokenIndex === -1) return state;

          const updatedTokens = [...state.tokens];
          const token = updatedTokens[tokenIndex];

          const updatedTrades = [tradeData, ...token.recentTrades].slice(
            0,
            MAX_TRADES_PER_TOKEN
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
      getToken: (address) => get().tokens.find((t) => t.address === address),
      updateTokenPrice: (address: string, priceInUsd: number) =>
        set((state) => {
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
          recentTrades: token.recentTrades.slice(0, MAX_TRADES_PER_TOKEN),
        })),
        viewedTokens: state.viewedTokens,
      }),
    }
  )
);

export default usePumpPortalStore;

async function fetchTokenMetadataFromChain(mintAddress: string) {
  try {
    debugLog("Attempting to fetch metadata from chain for:", mintAddress);

    const response = await axios.post("https://api.mainnet-beta.solana.com", {
      jsonrpc: "2.0",
      id: 1,
      method: "getAccountInfo",
      params: [mintAddress, { encoding: "jsonParsed" }],
    });

    debugLog("Chain metadata response:", response.data);

    if (response.data?.result?.value?.data?.parsed?.info?.uri) {
      const uri = response.data.result.value.data.parsed.info.uri;
      debugLog("Found URI from chain:", uri);
      return uri;
    }

    return null;
  } catch (error) {
    console.error("Failed to fetch metadata from chain:", error);
    return null;
  }
}
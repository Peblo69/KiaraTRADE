// client/src/lib/pump-portal-websocket.ts - Part 1: Imports and Initial Interfaces
import { create } from 'zustand';
import { format } from 'date-fns';
import axios from 'axios';

// Constants
const MAX_TRADES_PER_TOKEN = 100;
const MAX_TOKENS_IN_LIST = 50;
const CURRENT_USER = "Peblo69";
const BILLION = 1_000_000_000;

// Debug helper
const DEBUG = true;
function debugLog(action: string, data?: any) {
  if (DEBUG) {
    console.log(`[PumpPortal][${action}]`, data || '');
  }
}

export interface TokenMetadata {
  name: string;
  symbol: string;
  decimals: number;
  uri?: string;
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
  txType: 'buy' | 'sell';
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

export interface TokenAnalysis {
  risk: {
    level: 'LOW' | 'MEDIUM' | 'HIGH';
    score: number;
    factors: {
      mintAuthority: boolean;
      freezeAuthority: boolean;
      concentration: number;
      liquidity: number;
      age: number;
    };
  };
  security: {
    mintAuthority: boolean;
    freezeAuthority: boolean;
    mutable: boolean;
  };
  market: {
    totalLiquidity: number;
    totalMarkets: number;
    lpProviders: number;
  };
  holders: {
    total: number;
    topHoldersControl: number;
    distribution: Array<{
      address: string;
      percentage: number;
      isInsider: boolean;
    }>;
  };
}
// client/src/lib/pump-portal-websocket.ts - Part 2: Token Interfaces and Store Interface
export interface PumpPortalToken {
  symbol: string;
  name: string;
  address: string;
  imageLink?: string;
  bondingCurveKey: string;
  vTokensInBondingCurve: number;
  vSolInBondingCurve: number;
  marketCapSol: number;
  priceInSol?: number;
  priceInUsd?: number;
  devWallet?: string;
  recentTrades: TokenTrade[];
  metadata?: TokenMetadata;
  analysis?: TokenAnalysis;
  lastAnalyzedAt?: string;
  analyzedBy?: string;
  createdAt?: string;
}

interface PumpPortalStore {
  tokens: PumpPortalToken[];
  viewedTokens: { [key: string]: PumpPortalToken };
  isConnected: boolean;
  solPrice: number;
  lastUpdate: number;
  activeTokenView: string | null;
  currentUser: string;
  addToken: (tokenData: any) => void;
  addTradeToHistory: (address: string, tradeData: TokenTrade) => void;
  setConnected: (connected: boolean) => void;
  setSolPrice: (price: number) => void;
  resetTokens: () => void;
  addToViewedTokens: (address: string) => void;
  setActiveTokenView: (address: string | null) => void;
  getToken: (address: string) => PumpPortalToken | undefined;
  updateTokenAnalysis: (address: string, analysis: TokenAnalysis) => void;
  updateTokenPrice: (address: string, priceInUsd: number) => void;
  getTokenMetadata: (address: string) => Promise<TokenMetadata | null>;
  fetchAnalysis: (address: string) => Promise<void>;
}
// client/src/lib/pump-portal-websocket.ts - Part 3: Store Implementation
export const usePumpPortalStore = create<PumpPortalStore>((set, get) => {
  return {
    tokens: [],
    viewedTokens: {},
    isConnected: false,
    solPrice: 0,
    lastUpdate: Date.now(),
    activeTokenView: null,
    currentUser: CURRENT_USER,

    addToken: (tokenData) => set((state) => {
      debugLog('addToken', { mint: tokenData.mint });
      const newToken = mapTokenData(tokenData);

      if (tokenData.analysis) {
        newToken.analysis = tokenData.analysis;
        newToken.lastAnalyzedAt = state.currentUser; //Using currentUser as a placeholder since currentTime is removed.
        newToken.analyzedBy = state.currentUser;
      }

      // Calculate initial price if possible
      if (newToken.vTokensInBondingCurve && newToken.vSolInBondingCurve) {
        newToken.priceInSol = newToken.vSolInBondingCurve / BILLION;
        newToken.priceInUsd = newToken.priceInSol * state.solPrice;
      }

      const existingTokenIndex = state.tokens.findIndex(t => t.address === newToken.address);
      const isViewed = state.activeTokenView === newToken.address;

      if (existingTokenIndex >= 0) {
        const updatedTokens = state.tokens.map((t, i) => {
          if (i === existingTokenIndex) {
            return {
              ...t,
              ...newToken,
              devWallet: t.devWallet || newToken.devWallet,
              analysis: t.analysis || newToken.analysis,
              lastAnalyzedAt: t.lastAnalyzedAt || state.currentUser, //Using currentUser as a placeholder.
              analyzedBy: t.analyzedBy || state.currentUser,
              recentTrades: [...(t.recentTrades || []), ...(newToken.recentTrades || [])].slice(0, MAX_TRADES_PER_TOKEN)
            };
          }
          return t;
        });

        if (isViewed) {
          return {
            tokens: updatedTokens,
            viewedTokens: {
              ...state.viewedTokens,
              [newToken.address]: updatedTokens[existingTokenIndex]
            },
            lastUpdate: Date.now()
          };
        }

        return {
          tokens: updatedTokens,
          lastUpdate: Date.now()
        };
      }

      const updatedTokens = [newToken, ...state.tokens]
        .filter((t, i) => i < MAX_TOKENS_IN_LIST || t.address === state.activeTokenView);

      // Fetch additional data
      get().getTokenMetadata(newToken.address)
        .then(metadata => {
          if (metadata) {
            get().addToken({ ...newToken, metadata });
          }
        })
        .catch(console.error);

      get().fetchAnalysis(newToken.address)
        .catch(console.error);

      return {
        tokens: updatedTokens,
        lastUpdate: Date.now(),
        ...(isViewed && {
          viewedTokens: {
            ...state.viewedTokens,
            [newToken.address]: newToken
          }
        })
      };
    }),

    addTradeToHistory: (address: string, tradeData: TokenTrade) => set((state) => {
      debugLog('addTradeToHistory', {
        token: address,
        type: tradeData.txType,
        amount: tradeData.solAmount
      });

      const existingToken = state.viewedTokens[address] ||
                           state.tokens.find(t => t.address === address);

      // If token doesn't exist, create a new basic token from trade data
      if (!existingToken) {
        debugLog('Creating new token from trade', { address });

        const newToken: PumpPortalToken = {
          symbol: address.slice(0, 6),
          name: `Token ${address.slice(0, 8)}`,
          address: address,
          imageLink: 'https://via.placeholder.com/150',
          bondingCurveKey: tradeData.bondingCurveKey,
          vTokensInBondingCurve: tradeData.vTokensInBondingCurve,
          vSolInBondingCurve: tradeData.vSolInBondingCurve,
          marketCapSol: tradeData.marketCapSol,
          priceInSol: tradeData.priceInSol,
          priceInUsd: tradeData.priceInUsd,
          recentTrades: [tradeData],
          lastAnalyzedAt: CURRENT_USER, //Using currentUser as a placeholder.
          analyzedBy: CURRENT_USER,
          createdAt: undefined //Removed createdAt as it relied on UTC_DATE_FORMAT
        };

        // Add new token to the store
        return {
          tokens: [newToken, ...state.tokens].slice(0, MAX_TOKENS_IN_LIST),
          lastUpdate: Date.now()
        };
      }

      // For existing tokens, update with new trade data
      const updateToken = (token: PumpPortalToken): PumpPortalToken => ({
        ...token,
        recentTrades: [tradeData, ...(token.recentTrades || [])].slice(0, MAX_TRADES_PER_TOKEN),
        bondingCurveKey: tradeData.bondingCurveKey,
        vTokensInBondingCurve: tradeData.vTokensInBondingCurve,
        vSolInBondingCurve: tradeData.vSolInBondingCurve,
        marketCapSol: tradeData.marketCapSol,
        priceInSol: tradeData.priceInSol,
        priceInUsd: tradeData.priceInUsd
      });

      // Update existing token in both tokens list and viewedTokens if present
      const isViewed = state.activeTokenView === address;
      const updatedTokens = state.tokens.map(t =>
        t.address === address ? updateToken(t) : t
      );

      const updates: Partial<PumpPortalStore> = {
        tokens: updatedTokens,
        lastUpdate: Date.now()
      };

      if (isViewed) {
        updates.viewedTokens = {
          ...state.viewedTokens,
          [address]: updateToken(existingToken)
        };
      }

      // Trigger metadata fetch for new tokens
      if (!existingToken.metadata) {
        get().getTokenMetadata(address)
          .then(metadata => {
            if (metadata) {
              get().addToken({ ...existingToken, metadata });
            }
          })
          .catch(error => {
            console.error('[PumpPortal] Failed to fetch token metadata:', error);
          });
      }

      return updates;
    }),
    // client/src/lib/pump-portal-websocket.ts - Part 4: Store Implementation Continued

    updateTokenPrice: (address: string, priceInUsd: number) => set(state => {
      debugLog('updateTokenPrice', { address, priceInUsd });
      const priceInSol = priceInUsd / state.solPrice;

      const updatedTokens = state.tokens.map(token =>
        token.address === address
          ? { ...token, priceInUsd, priceInSol }
          : token
      );

      const updates: Partial<PumpPortalStore> = {
        tokens: updatedTokens,
        lastUpdate: Date.now()
      };

      if (state.viewedTokens[address]) {
        updates.viewedTokens = {
          ...state.viewedTokens,
          [address]: {
            ...state.viewedTokens[address],
            priceInUsd,
            priceInSol
          }
        };
      }

      return updates as any;
    }),

    setConnected: (connected) => {
      debugLog('setConnected', { connected });
      set({
        isConnected: connected,
        lastUpdate: Date.now()
      });
    },

    setSolPrice: (price) => {
      debugLog('setSolPrice', { price });
      set({ solPrice: price, lastUpdate: Date.now() });
    },

    resetTokens: () => {
      debugLog('resetTokens');
      set({
        tokens: [],
        viewedTokens: {},
        activeTokenView: null,
        lastUpdate: Date.now()
      });
    },

    addToViewedTokens: (address) => set((state) => {
      debugLog('addToViewedTokens', { address });
      const token = state.tokens.find(t => t.address === address);
      if (!token) return state;

      return {
        viewedTokens: {
          ...state.viewedTokens,
          [address]: token
        },
        lastUpdate: Date.now()
      };
    }),

    setActiveTokenView: (address) => set((state) => {
      debugLog('setActiveTokenView', { address });
      if (!address) {
        return {
          activeTokenView: null,
          lastUpdate: Date.now()
        };
      }

      const token = state.tokens.find(t => t.address === address);
      if (!token) return state;

      return {
        activeTokenView: address,
        viewedTokens: {
          ...state.viewedTokens,
          [address]: token
        },
        lastUpdate: Date.now()
      };
    }),

    getToken: (address) => {
      debugLog('getToken', { address });
      const state = get();
      return state.viewedTokens[address] || state.tokens.find(t => t.address === address);
    },

    updateTokenAnalysis: (address, analysis) => set(state => {
      debugLog('updateTokenAnalysis', { address });
      const updatedTokens = state.tokens.map(token =>
        token.address === address ? {
          ...token,
          analysis,
          lastAnalyzedAt: state.currentUser, //Using currentUser as a placeholder.
          analyzedBy: state.currentUser
        } : token
      );

      const updates: Partial<PumpPortalStore> = {
        tokens: updatedTokens,
        lastUpdate: Date.now()
      };

      if (state.viewedTokens[address]) {
        updates.viewedTokens = {
          ...state.viewedTokens,
          [address]: {
            ...state.viewedTokens[address],
            analysis,
            lastAnalyzedAt: state.currentUser, //Using currentUser as a placeholder.
            analyzedBy: state.currentUser
          }
        };
      }

      return updates as any;
    }),
    // client/src/lib/pump-portal-websocket.ts - Part 5: Final Implementation

    getTokenMetadata: async (address: string) => {
      try {
        debugLog('getTokenMetadata', { address });
        const response = await axios.get(`/api/token/${address}/metadata`);
        return response.data;
      } catch (error) {
        console.error('[PumpPortal] Failed to fetch token metadata:', error);
        return null;
      }
    },

    fetchAnalysis: async (address: string) => {
      try {
        debugLog('fetchAnalysis', { address });
        const response = await axios.get(`/api/token/${address}/analysis`);
        if (response.data) {
          get().updateTokenAnalysis(address, response.data);
        }
      } catch (error) {
        console.error('[PumpPortal] Failed to fetch token analysis:', error);
      }
    }
  };
});

export function mapTokenData(data: any): PumpPortalToken {
  debugLog('mapTokenData', { mint: data.mint });
  return {
    symbol: data.symbol || data.mint?.slice(0, 6) || 'Unknown',
    name: data.name || `Token ${data.mint?.slice(0, 8)}`,
    address: data.mint || '',
    imageLink: data.imageLink || 'https://via.placeholder.com/150',
    bondingCurveKey: data.bondingCurveKey,
    vTokensInBondingCurve: data.vTokensInBondingCurve,
    vSolInBondingCurve: data.vSolInBondingCurve,
    marketCapSol: data.marketCapSol,
    priceInSol: data.priceInSol,
    priceInUsd: data.priceInUsd,
    devWallet: data.devWallet,
    recentTrades: data.recentTrades || [],
    metadata: data.metadata,
    analysis: data.analysis,
    lastAnalyzedAt: CURRENT_USER, //Using currentUser as a placeholder.
    analyzedBy: CURRENT_USER,
    createdAt: undefined //Removed createdAt as it relied on UTC_DATE_FORMAT
  };
}


// Make store available globally for debugging
if (typeof window !== 'undefined') {
  window.usePumpPortalStore = usePumpPortalStore;
}

// Type definitions for global store
declare global {
  interface Window {
    usePumpPortalStore: typeof usePumpPortalStore;
  }
}

// Export the store
export default usePumpPortalStore;
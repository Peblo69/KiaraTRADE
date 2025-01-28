import { create } from 'zustand';
import { format } from 'date-fns';
import axios from 'axios';

// Constants
const MAX_TRADES_PER_TOKEN = 100;
const MAX_TOKENS_IN_LIST = 50;
const CURRENT_USER = "Peblo69";

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
  mint?: string;
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
}

export function mapTokenData(data: any): PumpPortalToken {
  debugLog('mapTokenData', data);

  // Extract token name and symbol
  const tokenName = data.metadata?.name || data.name;
  const tokenSymbol = data.metadata?.symbol || data.symbol;
  const mintAddress = data.mint || data.address || '';

  // Handle both newToken events and trade events
  const tokenData: PumpPortalToken = {
    symbol: tokenSymbol || mintAddress.slice(0, 6).toUpperCase(),
    name: tokenName || `Token ${mintAddress.slice(0, 8)}`,
    address: mintAddress,
    bondingCurveKey: data.bondingCurveKey || '',
    vTokensInBondingCurve: data.vTokensInBondingCurve || 0,
    vSolInBondingCurve: data.vSolInBondingCurve || 0,
    marketCapSol: data.marketCapSol || 0,
    priceInSol: data.priceInSol || 0,
    priceInUsd: data.priceInUsd || 0,
    devWallet: data.devWallet || data.traderPublicKey,
    recentTrades: [],
    metadata: {
      name: tokenName || `Token ${mintAddress.slice(0, 8)}`,
      symbol: tokenSymbol || mintAddress.slice(0, 6).toUpperCase(),
      decimals: 9,
      mint: mintAddress,
      uri: data.uri || '',
      creators: data.creators || []
    },
    lastAnalyzedAt: Date.now().toString(),
    analyzedBy: CURRENT_USER,
    createdAt: data.txType === 'create' ? Date.now().toString() : undefined
  };

  debugLog('Mapped token data', tokenData);
  return tokenData;
}

// Add new function for fetching token metadata from chain
async function fetchTokenMetadataFromChain(mintAddress: string) {
  try {
    debugLog('Attempting to fetch metadata from chain for:', mintAddress);

    const response = await axios.post('https://api.mainnet-beta.solana.com', {
      jsonrpc: '2.0',
      id: 1,
      method: 'getAccountInfo',
      params: [
        mintAddress,
        { encoding: 'jsonParsed' }
      ]
    });

    debugLog('Chain metadata response:', response.data);

    if (response.data?.result?.value?.data?.parsed?.info?.uri) {
      const uri = response.data.result.value.data.parsed.info.uri;
      debugLog('Found URI from chain:', uri);
      return uri;
    }

    return null;
  } catch (error) {
    console.error('Failed to fetch metadata from chain:', error);
    return null;
  }
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
  updateTokenPrice: (address: string, priceInUsd: number) => void;
  fetchTokenUri: (address: string) => Promise<string | null>;
}

export const usePumpPortalStore = create<PumpPortalStore>((set, get) => ({
  tokens: [],
  viewedTokens: {},
  isConnected: false,
  solPrice: 0,
  lastUpdate: Date.now(),
  activeTokenView: null,
  currentUser: CURRENT_USER,

  addToken: (tokenData) => set((state) => {
    debugLog('addToken', tokenData);
    debugLog('Token URI:', tokenData.uri || tokenData.metadata?.uri);

    const newToken = mapTokenData(tokenData);
    const existingTokenIndex = state.tokens.findIndex(t => t.address === newToken.address);
    const isViewed = state.activeTokenView === newToken.address;

    if (existingTokenIndex >= 0) {
      const updatedTokens = state.tokens.map((t, i) => {
        if (i === existingTokenIndex) {
          return {
            ...t,
            ...newToken,
            recentTrades: [...(t.recentTrades || []), ...(newToken.recentTrades || [])].slice(0, MAX_TRADES_PER_TOKEN)
          };
        }
        return t;
      });

      return {
        tokens: updatedTokens,
        lastUpdate: Date.now(),
        ...(isViewed && {
          viewedTokens: {
            ...state.viewedTokens,
            [newToken.address]: updatedTokens[existingTokenIndex]
          }
        })
      };
    }

    return {
      tokens: [newToken, ...state.tokens].slice(0, MAX_TOKENS_IN_LIST),
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

    const token = state.viewedTokens[address] || state.tokens.find(t => t.address === address);
    if (!token) return state;

    const updatedToken = {
      ...token,
      recentTrades: [tradeData, ...(token.recentTrades || [])].slice(0, MAX_TRADES_PER_TOKEN),
      bondingCurveKey: tradeData.bondingCurveKey,
      vTokensInBondingCurve: tradeData.vTokensInBondingCurve,
      vSolInBondingCurve: tradeData.vSolInBondingCurve,
      marketCapSol: tradeData.marketCapSol,
      priceInSol: tradeData.priceInSol,
      priceInUsd: tradeData.priceInUsd
    };

    const updatedTokens = state.tokens.map(t =>
      t.address === address ? updatedToken : t
    );

    return {
      tokens: updatedTokens,
      lastUpdate: Date.now(),
      ...(state.viewedTokens[address] && {
        viewedTokens: {
          ...state.viewedTokens,
          [address]: updatedToken
        }
      })
    };
  }),

  setConnected: (connected) => {
    debugLog('setConnected', { connected });
    set({ isConnected: connected, lastUpdate: Date.now() });
  },

  setSolPrice: (price) => {
    debugLog('setSolPrice', { price });
    set({ solPrice: price, lastUpdate: Date.now() });
  },

  resetTokens: () => {
    debugLog('resetTokens');
    set({ tokens: [], viewedTokens: {}, activeTokenView: null, lastUpdate: Date.now() });
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
      return { activeTokenView: null, lastUpdate: Date.now() };
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

  updateTokenPrice: (address: string, priceInUsd: number) => set(state => {
    debugLog('updateTokenPrice', { address, priceInUsd });
    const priceInSol = priceInUsd / state.solPrice;

    const updatedTokens = state.tokens.map(token =>
      token.address === address ? { ...token, priceInUsd, priceInSol } : token
    );

    return {
      tokens: updatedTokens,
      lastUpdate: Date.now(),
      ...(state.viewedTokens[address] && {
        viewedTokens: {
          ...state.viewedTokens,
          [address]: { ...state.viewedTokens[address], priceInUsd, priceInSol }
        }
      })
    };
  }),

  fetchTokenUri: async (address: string) => {
    const token = get().getToken(address);
    debugLog('fetchTokenUri', { address });

    // If we already have a URI, return it
    if (token?.metadata?.uri) {
      debugLog('URI already exists:', token.metadata.uri);
      return token.metadata.uri;
    }

    // Try to fetch from chain
    const uri = await fetchTokenMetadataFromChain(address);
    if (uri) {
      // Update token with new URI
      set(state => ({
        tokens: state.tokens.map(t => {
          if (t.address === address) {
            return {
              ...t,
              metadata: {
                ...t.metadata,
                uri
              }
            };
          }
          return t;
        }),
        ...(state.viewedTokens[address] && {
          viewedTokens: {
            ...state.viewedTokens,
            [address]: {
              ...state.viewedTokens[address],
              metadata: {
                ...state.viewedTokens[address].metadata,
                uri
              }
            }
          }
        })
      }));
    }

    return uri;
  }
}));

export default usePumpPortalStore;

import { create } from 'zustand';
import { format } from 'date-fns';
import axios from 'axios';
import { calculatePumpFunTokenMetrics, calculateVolumeMetrics, calculateTokenRisk } from "@/utils/token-calculations";

// Constants
const MAX_TRADES_PER_TOKEN = 100;
const MAX_TOKENS_IN_LIST = 50;
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
  volume24h?: number;
  riskMetrics?: any;
  isNew?: boolean;
  website?: string | null;
  twitter?: string | null;
  telegram?: string | null;
  socials?: {
    website: string | null;
    twitter: string | null;
    telegram: string | null;
  };
}

interface PumpPortalStore {
  tokens: PumpPortalToken[];
  viewedTokens: { [key: string]: PumpPortalToken };
  isConnected: boolean;
  solPrice: number;
  activeTokenView: string | null;
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
  getNewTokens: () => PumpPortalToken[];
  getAboutToGraduateTokens: () => PumpPortalToken[];
  getGraduatedTokens: () => PumpPortalToken[];
}

export const usePumpPortalStore = create<PumpPortalStore>((set, get) => ({
  tokens: [],
  viewedTokens: {},
  isConnected: false,
  solPrice: 0,
  activeTokenView: null,

  addToken: (tokenData) => set((state) => {
    debugLog('addToken', tokenData);
    debugLog('Token URI:', tokenData.uri || tokenData.metadata?.uri);

    const tokenMetrics = calculatePumpFunTokenMetrics({
      vSolInBondingCurve: tokenData.vSolInBondingCurve || 0,
      vTokensInBondingCurve: tokenData.vTokensInBondingCurve || 0,
      solPrice: state.solPrice
    });

    const newToken = {
      symbol: tokenData.symbol || tokenData.metadata?.symbol || tokenData.address.slice(0, 6).toUpperCase(),
      name: tokenData.name || tokenData.metadata?.name || `Token ${tokenData.address.slice(0, 8)}`,
      address: tokenData.mint || tokenData.address,
      bondingCurveKey: tokenData.bondingCurveKey || '',
      vTokensInBondingCurve: tokenData.vTokensInBondingCurve || 0,
      vSolInBondingCurve: tokenData.vSolInBondingCurve || 0,
      marketCapSol: tokenMetrics.marketCap.sol,
      priceInSol: tokenMetrics.price.sol,
      priceInUsd: tokenMetrics.price.usd,
      devWallet: tokenData.devWallet || tokenData.traderPublicKey,
      recentTrades: [],
      metadata: {
        name: tokenData.name || tokenData.metadata?.name || `Token ${tokenData.address.slice(0, 8)}`,
        symbol: tokenData.symbol || tokenData.metadata?.symbol || tokenData.address.slice(0, 6).toUpperCase(),
        decimals: 9,
        mint: tokenData.mint || tokenData.address,
        uri: tokenData.uri || '',
        imageUrl: tokenData.metadata?.imageUrl || tokenData.imageUrl,
        creators: tokenData.creators || []
      },
      website: tokenData.website || null,
      twitter: tokenData.twitter || null,
      telegram: tokenData.telegram || null,
      socials: {
        website: tokenData.website || null,
        twitter: tokenData.twitter || null,
        telegram: tokenData.telegram || null
      }
    };

    const existingTokenIndex = state.tokens.findIndex(t => t.address === newToken.address);
    const isViewed = state.activeTokenView === newToken.address;

    if (existingTokenIndex >= 0) {
      const updatedTokens = state.tokens.map((t, i) => {
        if (i === existingTokenIndex) {
          return {
            ...t,
            ...newToken,
            recentTrades: [...(t.recentTrades || []), ...(tokenData.recentTrades || [])].slice(0, MAX_TRADES_PER_TOKEN)
          };
        }
        return t;
      });

      return {
        tokens: updatedTokens,
        ...(isViewed && {
          viewedTokens: {
            ...state.viewedTokens,
            [newToken.address]: updatedTokens[existingTokenIndex]
          }
        })
      };
    }

    const tokenWithFlag = {
      ...newToken,
      isNew: true
    };

    return {
      tokens: [tokenWithFlag, ...state.tokens].slice(0, MAX_TOKENS_IN_LIST),
      ...(isViewed && {
        viewedTokens: {
          ...state.viewedTokens,
          [newToken.address]: tokenWithFlag
        }
      })
    };
  }),

  addTradeToHistory: (address, tradeData) => set((state) => {
    debugLog('addTradeToHistory', {
      token: address,
      type: tradeData.txType,
      amount: tradeData.solAmount
    });

    const token = state.viewedTokens[address] || state.tokens.find(t => t.address === address);
    if (!token) return state;

    const updatedTrades = [tradeData, ...(token.recentTrades || [])].slice(0, MAX_TRADES_PER_TOKEN);

    const tokenMetrics = calculatePumpFunTokenMetrics({
      vSolInBondingCurve: tradeData.vSolInBondingCurve,
      vTokensInBondingCurve: tradeData.vTokensInBondingCurve,
      solPrice: state.solPrice
    });

    const volumeMetrics = calculateVolumeMetrics(updatedTrades);

    const updatedToken = {
      ...token,
      recentTrades: updatedTrades,
      bondingCurveKey: tradeData.bondingCurveKey,
      vTokensInBondingCurve: tradeData.vTokensInBondingCurve,
      vSolInBondingCurve: tradeData.vSolInBondingCurve,
      marketCapSol: tokenMetrics.marketCap.sol,
      priceInSol: tokenMetrics.price.sol,
      priceInUsd: tokenMetrics.price.usd,
      volume24h: volumeMetrics.volume24h,
      riskMetrics: calculateTokenRisk({
        ...token,
        recentTrades: updatedTrades
      })
    };

    const updatedTokens = state.tokens.map(t =>
      t.address === address ? updatedToken : t
    );

    return {
      tokens: updatedTokens,
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
    set({ isConnected: connected });
  },

  setSolPrice: (price) => {
    debugLog('setSolPrice', { price });
    set({ solPrice: price });
  },

  resetTokens: () => {
    debugLog('resetTokens');
    set({ tokens: [], viewedTokens: {}, activeTokenView: null });
  },

  addToViewedTokens: (address) => set((state) => {
    debugLog('addToViewedTokens', { address });
    const token = state.tokens.find(t => t.address === address);
    if (!token) return state;
    return {
      viewedTokens: {
        ...state.viewedTokens,
        [address]: token
      }
    };
  }),

  setActiveTokenView: (address) => set((state) => {
    debugLog('setActiveTokenView', { address });
    if (!address) {
      return { activeTokenView: null };
    }
    const token = state.tokens.find(t => t.address === address);
    if (!token) return state;
    return {
      activeTokenView: address,
      viewedTokens: {
        ...state.viewedTokens,
        [address]: token
      }
    };
  }),

  getToken: (address) => {
    debugLog('getToken', { address });
    const state = get();
    return state.viewedTokens[address] || state.tokens.find(t => t.address === address);
  },

  updateTokenPrice: (address, priceInUsd) => set(state => {
    debugLog('updateTokenPrice', { address, priceInUsd });
    const priceInSol = priceInUsd / state.solPrice;

    const updatedTokens = state.tokens.map(token =>
      token.address === address ? { ...token, priceInUsd, priceInSol } : token
    );

    return {
      tokens: updatedTokens,
      ...(state.viewedTokens[address] && {
        viewedTokens: {
          ...state.viewedTokens,
          [address]: { ...state.viewedTokens[address], priceInUsd, priceInSol }
        }
      })
    };
  }),

  fetchTokenUri: async (address) => {
    const token = get().getToken(address);
    debugLog('fetchTokenUri', { address });

    if (token?.metadata?.uri) {
      debugLog('URI already exists:', token.metadata.uri);
      return token.metadata.uri;
    }

    const uri = await fetchTokenMetadataFromChain(address);
    if (uri) {
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
  },

  getNewTokens: () => {
    const { tokens } = get();
    return tokens.filter(t => t.isNew);
  },

  getAboutToGraduateTokens: () => {
    const { tokens } = get();
    return tokens.filter(t => !t.isNew && t.marketCapSol && t.marketCapSol >= 70 && t.marketCapSol < 100);
  },

  getGraduatedTokens: () => {
    const { tokens } = get();
    return tokens.filter(t => !t.isNew && t.marketCapSol && t.marketCapSol >= 100);
  }
}));

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

export default usePumpPortalStore;

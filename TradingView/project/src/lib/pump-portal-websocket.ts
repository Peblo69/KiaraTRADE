import { create } from 'zustand';
import { format } from 'date-fns';
import axios from 'axios';
import { calculatePumpFunTokenMetrics, calculateVolumeMetrics, calculateTokenRisk } from "../utils/token-calculations";
import { WalletProfile } from '../types/wallet-profile';

// Constants
const MAX_TRADES_PER_TOKEN = 100;
const MAX_TOKENS_IN_LIST = 50;

// TokenMetadata interface that includes imageUrl
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
  walletProfiles: Map<string, WalletProfile>;
  addToken: (tokenData: any) => void;
  addTradeToHistory: (address: string, tradeData: TokenTrade) => void;
  setConnected: (connected: boolean) => void;
  setSolPrice: (price: number) => void;
  resetTokens: () => void;
  addToViewedTokens: (address: string) => void;
  setActiveTokenView: (address: string | null) => void;
  getToken: (address: string) => PumpPortalToken | undefined;
  updateTokenPrice: (address: string, priceInUsd: number) => void;
  addWalletProfile: (address: string, profile: WalletProfile) => void;
  getWalletProfile: (address: string) => WalletProfile | undefined;
}

export const usePumpPortalStore = create<PumpPortalStore>((set, get) => ({
  tokens: [],
  viewedTokens: {},
  isConnected: false,
  solPrice: 0,
  activeTokenView: null,
  walletProfiles: new Map(),

  // Add wallet profile
  addWalletProfile: (address: string, profile: WalletProfile) => set(state => {
    const profiles = new Map(state.walletProfiles);
    profiles.set(address, profile);
    return { walletProfiles: profiles };
  }),

  // Get wallet profile
  getWalletProfile: (address: string) => {
    const state = get();
    return state.walletProfiles.get(address);
  },

  // This function maps the websocket data to our token format
  addToken: (tokenData) => set((state) => {
    const tokenName = tokenData.metadata?.name || tokenData.name;
    const tokenSymbol = tokenData.metadata?.symbol || tokenData.symbol;
    const mintAddress = tokenData.mint || tokenData.address || '';
    const imageUrl = tokenData.metadata?.imageUrl || tokenData.imageUrl;

    // Calculate token metrics
    const tokenMetrics = calculatePumpFunTokenMetrics({
      vSolInBondingCurve: tokenData.vSolInBondingCurve || 0,
      vTokensInBondingCurve: tokenData.vTokensInBondingCurve || 0,
      solPrice: state.solPrice
    });

    const newToken = {
      symbol: tokenSymbol || mintAddress.slice(0, 6).toUpperCase(),
      name: tokenName || `Token ${mintAddress.slice(0, 8)}`,
      address: mintAddress,
      bondingCurveKey: tokenData.bondingCurveKey || '',
      vTokensInBondingCurve: tokenData.vTokensInBondingCurve || 0,
      vSolInBondingCurve: tokenData.vSolInBondingCurve || 0,
      marketCapSol: tokenMetrics.marketCap.sol,
      priceInSol: tokenMetrics.price.sol,
      priceInUsd: tokenMetrics.price.usd,
      devWallet: tokenData.devWallet || tokenData.traderPublicKey,
      recentTrades: [],
      metadata: {
        name: tokenName || `Token ${mintAddress.slice(0, 8)}`,
        symbol: tokenSymbol || mintAddress.slice(0, 6).toUpperCase(),
        decimals: 9,
        mint: mintAddress,
        uri: tokenData.uri || '',
        imageUrl,
        creators: tokenData.creators || []
      },
      lastAnalyzedAt: tokenData.timestamp?.toString(),
      createdAt: tokenData.txType === 'create' ? tokenData.timestamp?.toString() : undefined,
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

    // Add new token with isNew flag
    const tokenWithFlag = {
      ...newToken,
      isNew: true
    };

    // Calculate initial risk metrics if we have trade history
    if (tokenData.recentTrades?.length) {
      const volumeMetrics = calculateVolumeMetrics(tokenData.recentTrades);
      const riskMetrics = calculateTokenRisk({
        ...tokenWithFlag,
        recentTrades: tokenData.recentTrades
      });

      Object.assign(tokenWithFlag, {
        volume24h: volumeMetrics.volume24h,
        riskMetrics
      });
    }

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

  addTradeToHistory: (address: string, tradeData: TokenTrade) => set((state) => {
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
    set({ isConnected: connected });
  },

  setSolPrice: (price) => {
    set({ solPrice: price });
  },

  resetTokens: () => {
    set({ tokens: [], viewedTokens: {}, activeTokenView: null });
  },

  addToViewedTokens: (address) => set((state) => {
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
    const state = get();
    return state.viewedTokens[address] || state.tokens.find(t => t.address === address);
  },

  updateTokenPrice: (address: string, priceInUsd: number) => set(state => {
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
}));

export default usePumpPortalStore;

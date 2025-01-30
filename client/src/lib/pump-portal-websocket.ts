import { create } from 'zustand';
import { format } from 'date-fns';
import axios from 'axios';
import { calculatePumpFunTokenMetrics, calculateVolumeMetrics, calculateTokenRisk } from "@/utils/token-calculations";

// Constants
const MAX_TRADES_PER_TOKEN = 100;
const MAX_TOKENS_IN_LIST = 50;
const CURRENT_USER = "Peblo69";
const COINGECKO_API_URL = 'https://api.coingecko.com/api/v3';

// Debug helper
const DEBUG = true;
function debugLog(action: string, data?: any) {
  if (DEBUG) {
    console.log(`[PumpPortal][${action}]`, data || '');
  }
}

// New function to fetch SOL price
async function fetchSolPrice() {
  try {
    const response = await axios.get(`${COINGECKO_API_URL}/simple/price`, {
      params: {
        ids: 'solana',
        vs_currencies: 'usd'
      }
    });
    return response.data.solana.usd;
  } catch (error) {
    console.error('Failed to fetch SOL price:', error);
    return null;
  }
}

// Start SOL price updates
async function startSolPriceUpdates(setSolPrice: (price: number) => void) {
  debugLog('Starting SOL price updates from CoinGecko...');

  // Initial fetch
  try {
    debugLog('Fetching SOL price from CoinGecko...');
    const price = await fetchSolPrice();
    if (price) {
      debugLog('Updated SOL price from CoinGecko:', price);
      setSolPrice(price);
    }
  } catch (error) {
    console.error('Failed to fetch initial SOL price:', error);
  }

  // Update every 30 seconds
  setInterval(async () => {
    try {
      const price = await fetchSolPrice();
      if (price) {
        debugLog('Updated SOL price from CoinGecko:', price);
        setSolPrice(price);
      }
    } catch (error) {
      console.error('Failed to update SOL price:', error);
    }
  }, 30000);
}

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

  // This function maps the websocket data to our token format
  addToken: (tokenData) => set((state) => {
    debugLog('addToken', tokenData);
    debugLog('Token URI:', tokenData.uri || tokenData.metadata?.uri);

    // Extract basic token info
    const tokenName = tokenData.metadata?.name || tokenData.name;
    const tokenSymbol = tokenData.metadata?.symbol || tokenData.symbol;
    const mintAddress = tokenData.mint || tokenData.address || '';
    const imageUrl = tokenData.metadata?.imageUrl || tokenData.imageUrl;

    // Calculate token metrics
    const tokenMetrics = calculatePumpFunTokenMetrics({
      vSolInBondingCurve: tokenData.vSolInBondingCurve || 0,
      vTokensInBondingCurve: tokenData.vTokensInBondingCurve || 0,
      solPrice: state.solPrice // Access solPrice from state instead of global store
    });

    debugLog('Token metrics calculated:', tokenMetrics);

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
        imageUrl: imageUrl,
        creators: tokenData.creators || []
      },
      lastAnalyzedAt: Date.now().toString(),
      analyzedBy: CURRENT_USER,
      createdAt: tokenData.txType === 'create' ? Date.now().toString() : undefined
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
        lastUpdate: Date.now(),
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
      lastUpdate: Date.now(),
      ...(isViewed && {
        viewedTokens: {
          ...state.viewedTokens,
          [newToken.address]: tokenWithFlag
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

    // Add new trade and calculate updated metrics
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
// Call startSolPriceUpdates after store creation
startSolPriceUpdates(usePumpPortalStore.getState().setSolPrice);
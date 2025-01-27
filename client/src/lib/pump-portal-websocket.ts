// client/src/lib/pump-portal-websocket.ts
import { create } from 'zustand';
import { format } from 'date-fns';
import { preloadTokenImages } from './token-metadata';
import axios from 'axios';

// Constants
const MAX_TRADES_PER_TOKEN = 100;
const MAX_TOKENS_IN_LIST = 50;
const WS_URL = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`;
const RECONNECT_DELAY = 5000;
const MAX_RECONNECT_ATTEMPTS = 5;
const SOL_PRICE_UPDATE_INTERVAL = 10_000;

function getUTCDateTime() {
  const now = new Date();
  return format(now, "yyyy-MM-dd HH:mm:ss");
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

export interface PumpPortalToken {
  symbol: string;
  name: string;
  address: string;
  imageLink?: string;
  bondingCurveKey: string;
  vTokensInBondingCurve: number;
  vSolInBondingCurve: number;
  marketCapSol: number;
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
  currentTime: string;

  addToken: (tokenData: any) => void;
  addTradeToHistory: (address: string, tradeData: any) => void;
  setConnected: (connected: boolean) => void;
  setSolPrice: (price: number) => void;
  resetTokens: () => void;
  addToViewedTokens: (address: string) => void;
  setActiveTokenView: (address: string | null) => void;
  getToken: (address: string) => PumpPortalToken | undefined;
  updateTokenAnalysis: (address: string, analysis: TokenAnalysis) => void;
  updateTimestamp: () => void;
  getTokenMetadata: (address: string) => Promise<TokenMetadata | null>;
  fetchAnalysis: (address: string) => Promise<void>;
}

export const usePumpPortalStore = create<PumpPortalStore>((set, get) => ({
  tokens: [],
  viewedTokens: {},
  isConnected: false,
  solPrice: 0,
  lastUpdate: Date.now(),
  activeTokenView: null,
  currentUser: 'Peblo69',
  currentTime: getUTCDateTime(),

  addToken: (tokenData) => set((state) => {
    const newToken = mapTokenData(tokenData);

    // Include analysis data if available
    if (tokenData.analysis) {
      newToken.analysis = tokenData.analysis;
      newToken.lastAnalyzedAt = state.currentTime;
      newToken.analyzedBy = state.currentUser;
    }

    // Track dev wallet from creation event
    if (tokenData.txType === 'create') {
      console.log('[PumpPortal] New token detected:', tokenData.mint);
      if (tokenData.traderPublicKey) {
        console.log('[PumpPortal] Setting creator wallet:', tokenData.traderPublicKey);
        newToken.devWallet = tokenData.traderPublicKey;
      }
    }

    const existingTokenIndex = state.tokens.findIndex(t => t.address === newToken.address);
    const isViewed = state.activeTokenView === newToken.address;

    // Update existing token while preserving dev wallet and analysis
    if (existingTokenIndex >= 0) {
      const updatedTokens = state.tokens.map((t, i) => {
        if (i === existingTokenIndex) {
          return { 
            ...t, 
            ...newToken,
            devWallet: t.devWallet || newToken.devWallet,
            analysis: t.analysis || newToken.analysis,
            lastAnalyzedAt: t.lastAnalyzedAt || state.currentTime,
            analyzedBy: t.analyzedBy || state.currentUser
          };
        }
        return t;
      });

      if (isViewed) {
        return {
          tokens: updatedTokens,
          viewedTokens: {
            ...state.viewedTokens,
            [newToken.address]: { 
              ...newToken,
              devWallet: state.viewedTokens[newToken.address]?.devWallet || newToken.devWallet,
              analysis: state.viewedTokens[newToken.address]?.analysis || newToken.analysis,
              lastAnalyzedAt: state.viewedTokens[newToken.address]?.lastAnalyzedAt || state.currentTime,
              analyzedBy: state.viewedTokens[newToken.address]?.analyzedBy || state.currentUser
            }
          },
          lastUpdate: Date.now()
        };
      }

      return { tokens: updatedTokens, lastUpdate: Date.now() };
    }

    // Add new token
    const updatedTokens = [newToken, ...state.tokens]
      .filter((t, i) => i < MAX_TOKENS_IN_LIST || t.address === state.activeTokenView);

    // Fetch metadata and analysis for new tokens
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

  addTradeToHistory: (address, tradeData) => set((state) => {
    const newTrade: TokenTrade = {
      signature: tradeData.signature,
      timestamp: Date.now(),
      mint: tradeData.mint,
      txType: tradeData.txType,
      tokenAmount: tradeData.tokenAmount,
      solAmount: tradeData.solAmount,
      traderPublicKey: tradeData.traderPublicKey,
      counterpartyPublicKey: tradeData.counterpartyPublicKey,
      bondingCurveKey: tradeData.bondingCurveKey,
      vTokensInBondingCurve: tradeData.vTokensInBondingCurve,
      vSolInBondingCurve: tradeData.vSolInBondingCurve,
      marketCapSol: tradeData.marketCapSol
    };

    const existingToken = state.viewedTokens[address] || 
                         state.tokens.find(t => t.address === address);

    if (!existingToken) return state;

    const updateToken = (token: PumpPortalToken): PumpPortalToken => {
      let updatedToken = { ...token };

      // Set dev wallet from first buy if not already set
      if (!token.devWallet && tradeData.txType === 'buy' && token.recentTrades.length === 0) {
        console.log('[PumpPortal] Setting dev wallet from first buy:', {
          token: address,
          wallet: tradeData.counterpartyPublicKey 
        });
        updatedToken.devWallet = tradeData.counterpartyPublicKey;
      }

      return {
        ...updatedToken,
        recentTrades: [newTrade, ...token.recentTrades].slice(0, MAX_TRADES_PER_TOKEN),
        bondingCurveKey: tradeData.bondingCurveKey,
        vTokensInBondingCurve: tradeData.vTokensInBondingCurve,
        vSolInBondingCurve: tradeData.vSolInBondingCurve,
        marketCapSol: tradeData.marketCapSol
      };
    };

    const isViewed = state.activeTokenView === address;
    const updates: Partial<PumpPortalStore> = {
      tokens: state.tokens.map(t => t.address === address ? updateToken(t) : t),
      lastUpdate: Date.now()
    };

    if (isViewed) {
      updates.viewedTokens = {
        ...state.viewedTokens,
        [address]: updateToken(existingToken)
      };
    }

    return updates as any;
  }),

  setConnected: (connected) => set({ isConnected: connected, lastUpdate: Date.now() }),
  setSolPrice: (price) => set({ solPrice: price, lastUpdate: Date.now() }),

  resetTokens: () => set({ 
    tokens: [],
    viewedTokens: {},
    activeTokenView: null,
    lastUpdate: Date.now()
  }),

  addToViewedTokens: (address) => set((state) => {
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
    const state = get();
    return state.viewedTokens[address] || state.tokens.find(t => t.address === address);
  },

  updateTokenAnalysis: (address, analysis) => set(state => {
    const currentTime = getUTCDateTime();

    const updatedTokens = state.tokens.map(token => 
      token.address === address ? { 
        ...token, 
        analysis,
        lastAnalyzedAt: currentTime,
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
          lastAnalyzedAt: currentTime,
          analyzedBy: state.currentUser
        }
      };
    }

    return updates as any;
  }),

  updateTimestamp: () => set(() => ({
    currentTime: getUTCDateTime()
  })),

  getTokenMetadata: async (address: string) => {
    try {
      const response = await axios.get(`/api/token/${address}/metadata`);
      return response.data;
    } catch (error) {
      console.error('[PumpPortal] Failed to fetch token metadata:', error);
      return null;
    }
  },

  fetchAnalysis: async (address: string) => {
    try {
      const response = await axios.get(`/api/token/${address}/analysis`);
      if (response.data) {
        get().updateTokenAnalysis(address, response.data);
      }
    } catch (error) {
      console.error('[PumpPortal] Failed to fetch token analysis:', error);
    }
  }
}));
}));

export function mapTokenData(data: any): PumpPortalToken {
  return {
    symbol: data.symbol || data.mint?.slice(0, 6) || 'Unknown',
    name: data.name || `Token ${data.mint?.slice(0, 8)}`,
    address: data.mint || '',
    imageLink: data.imageLink || 'https://via.placeholder.com/150',
    bondingCurveKey: data.bondingCurveKey,
    vTokensInBondingCurve: data.vTokensInBondingCurve,
    vSolInBondingCurve: data.vSolInBondingCurve,
    marketCapSol: data.marketCapSol,
    devWallet: data.devWallet,
    recentTrades: [],
    metadata: data.metadata,
    analysis: data.analysis,
    lastAnalyzedAt: getUTCDateTime(),
    analyzedBy: 'Peblo69',
    createdAt: data.createdAt ? format(new Date(data.createdAt), "yyyy-MM-dd HH:mm:ss") : undefined
  };
}

// Initialize WebSocket connection
let ws: WebSocket | null = null;
let reconnectAttempts = 0;

export function connectWebSocket() {
  if (ws?.readyState === WebSocket.OPEN) {
    console.log('[PumpPortal] WebSocket already connected');
    return;
  }

  try {
    ws = new WebSocket(WS_URL);

    ws.onopen = () => {
      console.log('[PumpPortal] WebSocket connected');
      reconnectAttempts = 0;
      usePumpPortalStore.getState().setConnected(true);
    };

    ws.onclose = () => {
      console.log('[PumpPortal] WebSocket disconnected');
      usePumpPortalStore.getState().setConnected(false);

      if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttempts++;
        setTimeout(connectWebSocket, RECONNECT_DELAY);
      } else {
        console.error('[PumpPortal] Max reconnection attempts reached');
      }
    };

    ws.onerror = (error) => {
      console.error('[PumpPortal] WebSocket error:', error);
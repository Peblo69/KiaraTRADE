import { create } from 'zustand';
import { preloadTokenImages } from './token-metadata';

// Constants 
const MAX_TRADES_PER_TOKEN = 100;
const WS_URL = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`;
const RECONNECT_DELAY = 5000;
const MAX_RECONNECT_ATTEMPTS = 5;
const SOL_PRICE_UPDATE_INTERVAL = 10_000;

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
}

interface PumpPortalStore {
  tokens: PumpPortalToken[];
  viewedTokens: { [key: string]: PumpPortalToken };
  isConnected: boolean;
  solPrice: number;
  lastUpdate: number;
  activeTokenView: string | null;
  addToken: (tokenData: any) => void;
  addTradeToHistory: (address: string, tradeData: any) => void;
  setConnected: (connected: boolean) => void;
  setSolPrice: (price: number) => void;
  resetTokens: () => void;
  addToViewedTokens: (address: string) => void;
  setActiveTokenView: (address: string | null) => void;
  getToken: (address: string) => PumpPortalToken | undefined;
}

export const usePumpPortalStore = create<PumpPortalStore>((set, get) => ({
  tokens: [],
  viewedTokens: {},
  isConnected: false,
  solPrice: 0,
  lastUpdate: Date.now(),
  activeTokenView: null,

  addToken: (tokenData) => {
    set((state) => {
      const newToken = mapTokenData(tokenData);

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

      if (existingTokenIndex >= 0) {
        const updatedTokens = state.tokens.map((t, i) => {
          if (i === existingTokenIndex) {
            return { 
              ...t, 
              ...newToken,
              devWallet: t.devWallet || newToken.devWallet 
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
                devWallet: state.viewedTokens[newToken.address]?.devWallet || newToken.devWallet
              }
            },
            lastUpdate: Date.now()
          };
        }

        return { tokens: updatedTokens, lastUpdate: Date.now() };
      }

      const updatedTokens = [newToken, ...state.tokens]
        .slice(0, MAX_TRADES_PER_TOKEN);

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
    });
  },

  addTradeToHistory: (address, tradeData) => {
    set((state) => {
      const token = state.viewedTokens[address] || 
                   state.tokens.find(t => t.address === address);

      if (!token) return state;

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

      const updatedToken = {
        ...token,
        recentTrades: [newTrade, ...token.recentTrades].slice(0, MAX_TRADES_PER_TOKEN),
        bondingCurveKey: tradeData.bondingCurveKey,
        vTokensInBondingCurve: tradeData.vTokensInBondingCurve,
        vSolInBondingCurve: tradeData.vSolInBondingCurve,
        marketCapSol: tradeData.marketCapSol
      };

      const isViewed = state.activeTokenView === address;
      const updates: Partial<PumpPortalStore> = {
        tokens: state.tokens.map(t => t.address === address ? updatedToken : t),
        lastUpdate: Date.now()
      };

      if (isViewed) {
        updates.viewedTokens = {
          ...state.viewedTokens,
          [address]: updatedToken
        };
      }

      return updates as any;
    });
  },

  setConnected: (connected) => set({ isConnected: connected, lastUpdate: Date.now() }),
  setSolPrice: (price) => set({ solPrice: price, lastUpdate: Date.now() }),
  resetTokens: () => set({ 
    tokens: [],
    viewedTokens: {},
    activeTokenView: null,
    lastUpdate: Date.now()
  }),

  addToViewedTokens: (address) => {
    set((state) => {
      const token = state.tokens.find(t => t.address === address);
      if (!token) return state;
      return {
        viewedTokens: {
          ...state.viewedTokens,
          [address]: token
        },
        lastUpdate: Date.now()
      };
    });
  },

  setActiveTokenView: (address) => {
    set((state) => {
      if (!address) return { 
        activeTokenView: null,
        lastUpdate: Date.now()
      };

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
    });
  },

  getToken: (address) => {
    const state = get();
    return state.viewedTokens[address] || state.tokens.find(t => t.address === address);
  }
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
    recentTrades: []
  };
}

// WebSocket connection
let ws: WebSocket | null = null;
let reconnectTimeout: NodeJS.Timeout | null = null;
let reconnectAttempts = 0;

// Initialize WebSocket
export function initializePumpPortalWebSocket() {
  if (typeof window === 'undefined') return;

  const store = usePumpPortalStore.getState();

  try {
    console.log('[PumpPortal] Initializing WebSocket...');
    ws = new WebSocket(WS_URL);

    ws.onopen = () => {
      console.log('[PumpPortal] WebSocket connected');
      store.setConnected(true);
      reconnectAttempts = 0;
    };

    ws.onmessage = async (event) => {
      try {
        const { type, data } = JSON.parse(event.data);

        switch (type) {
          case 'newToken': {
            console.log('[PumpPortal] New Token Details:', data);
            store.addToken(data);
            if (data.imageLink) {
              preloadTokenImages([{ imageLink: data.imageLink, symbol: data.symbol }]);
            }
            break;
          }
          case 'trade': {
            console.log('[PumpPortal] Trade Details:', data);
            store.addTradeToHistory(data.mint, data);
            break;
          }
        }
      } catch (error) {
        console.error('[PumpPortal] Failed to parse message:', error);
      }
    };

    ws.onclose = () => {
      console.log('[PumpPortal] WebSocket disconnected');
      store.setConnected(false);

      if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttempts++;
        const delay = RECONNECT_DELAY * Math.pow(1.5, reconnectAttempts);
        reconnectTimeout = setTimeout(initializePumpPortalWebSocket, delay);
      }
    };

    ws.onerror = (error) => {
      console.error('[PumpPortal] WebSocket error:', error);
      store.setConnected(false);
    };

  } catch (error) {
    console.error('[PumpPortal] Failed to initialize WebSocket:', error);
    if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
      reconnectAttempts++;
      const delay = RECONNECT_DELAY * Math.pow(1.5, reconnectAttempts);
      reconnectTimeout = setTimeout(initializePumpPortalWebSocket, delay);
    }
  }
}

// Initialize on load
if (typeof window !== 'undefined') {
  initializePumpPortalWebSocket();
}
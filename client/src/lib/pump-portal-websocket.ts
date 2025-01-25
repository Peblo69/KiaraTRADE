import { create } from 'zustand';
import { preloadTokenImages } from './token-metadata';
import axios from 'axios';

// Constants 
const MAX_TRADES_PER_TOKEN = 100;
const WS_URL = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`;
const RECONNECT_DELAY = 5000;
const MAX_RECONNECT_ATTEMPTS = 5;
const SOL_PRICE_UPDATE_INTERVAL = 10_000;
const MAX_TOKENS_IN_LIST = 50;

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
  recentTrades: TokenTrade[];
}

interface PumpPortalStore {
  tokens: PumpPortalToken[];
  viewedTokens: { [key: string]: PumpPortalToken }; // Cache for tokens being actively viewed
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

  addToken: (tokenData) => 
    set((state) => {
      const newToken = mapTokenData(tokenData);
      const existingTokenIndex = state.tokens.findIndex(t => t.address === newToken.address);

      // Check if token is currently being viewed
      const isViewed = state.activeTokenView === newToken.address;

      // Update existing token
      if (existingTokenIndex >= 0) {
        const updatedTokens = state.tokens.map((t, i) => 
          i === existingTokenIndex ? { ...t, ...newToken } : t
        );

        // If token is being viewed, also update in viewed tokens
        if (isViewed) {
          return {
            tokens: updatedTokens,
            viewedTokens: {
              ...state.viewedTokens,
              [newToken.address]: { ...newToken }
            },
            lastUpdate: Date.now()
          };
        }

        return { tokens: updatedTokens, lastUpdate: Date.now() };
      }

      // Add new token
      const updatedTokens = [newToken, ...state.tokens]
        .filter((t, i) => i < MAX_TOKENS_IN_LIST || t.address === state.activeTokenView);

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

  addTradeToHistory: (address, tradeData) => 
    set((state) => {
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

      const updateToken = (token: PumpPortalToken): PumpPortalToken => ({
        ...token,
        recentTrades: [newTrade, ...token.recentTrades].slice(0, MAX_TRADES_PER_TOKEN),
        bondingCurveKey: tradeData.bondingCurveKey,
        vTokensInBondingCurve: tradeData.vTokensInBondingCurve,
        vSolInBondingCurve: tradeData.vSolInBondingCurve,
        marketCapSol: tradeData.marketCapSol
      });

      // Update token in both lists if being viewed
      const isViewed = state.activeTokenView === address;
      const updates: Partial<PumpPortalStore> = {
        tokens: state.tokens.map(t => t.address === address ? updateToken(t) : t),
        lastUpdate: Date.now()
      };

      if (isViewed) {
        updates.viewedTokens = {
          ...state.viewedTokens,
          [address]: updateToken(state.viewedTokens[address] || state.tokens.find(t => t.address === address)!)
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
        [address]: { ...token }
      },
      lastUpdate: Date.now()
    };
  }),

  setActiveTokenView: (address) => set((state) => {
    // If clearing active view, maintain viewed token in cache temporarily
    if (!address) {
      return { 
        activeTokenView: null,
        lastUpdate: Date.now()
      };
    }

    // Setting new active view
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
    // Check viewed tokens first, then main list
    return state.viewedTokens[address] || state.tokens.find(t => t.address === address);
  }
}));

// Map raw token data 
function mapTokenData(data: any): PumpPortalToken {
  return {
    symbol: data.symbol || data.mint?.slice(0, 6) || 'Unknown',
    name: data.name || `Token ${data.mint?.slice(0, 8)}`,
    address: data.mint || '',
    imageLink: data.imageLink || 'https://via.placeholder.com/150',
    bondingCurveKey: data.bondingCurveKey,
    vTokensInBondingCurve: data.vTokensInBondingCurve,
    vSolInBondingCurve: data.vSolInBondingCurve,
    marketCapSol: data.marketCapSol,
    recentTrades: []
  };
}

// WebSocket connection
let ws: WebSocket | null = null;
let reconnectTimeout: NodeJS.Timeout | null = null;
let reconnectAttempts = 0;
let solPriceInterval: NodeJS.Timeout | null = null;
let connectionCheckInterval: NodeJS.Timeout | null = null;

// Fetch SOL price from Binance
const fetchSolanaPrice = async (retries = 3): Promise<number> => {
  try {
    const response = await axios.get('https://api.binance.com/api/v3/ticker/price?symbol=SOLUSDT');
    const price = Number(response.data.price);
    if (!isNaN(price) && price > 0) {
      return price;
    }
  } catch (error) {
    console.error('[PumpPortal] Failed to fetch SOL price:', error);
    if (retries > 0) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return fetchSolanaPrice(retries - 1);
    }
  }
  return 100; // fallback price
};

// Cleanup function
function cleanup() {
  if (ws) {
    try { ws.close(); } catch {}
    ws = null;
  }
  if (solPriceInterval) {
    clearInterval(solPriceInterval);
    solPriceInterval = null;
  }
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
    reconnectTimeout = null;
  }
  if (connectionCheckInterval) {
    clearInterval(connectionCheckInterval);
    connectionCheckInterval = null;
  }
}

// Initialize WebSocket
export function initializePumpPortalWebSocket() {
  if (typeof window === 'undefined') return;

  cleanup();
  const store = usePumpPortalStore.getState();

  try {
    console.log('[PumpPortal] Initializing WebSocket...');
    ws = new WebSocket(WS_URL);

    // Get initial SOL price
    fetchSolanaPrice().then(price => {
      store.setSolPrice(price);
      solPriceInterval = setInterval(async () => {
        const newPrice = await fetchSolanaPrice();
        store.setSolPrice(newPrice);
      }, SOL_PRICE_UPDATE_INTERVAL);
    });

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
            ws?.send(JSON.stringify({
              method: 'subscribeTokenTrade',
              keys: [data.mint],
            }));
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
      cleanup();

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

    // Add connection check interval
    connectionCheckInterval = setInterval(() => {
      const now = Date.now();
      const store = usePumpPortalStore.getState();

      // If no updates in 30 seconds, reset connection
      if (now - store.lastUpdate > 30000) {
        console.log('[PumpPortal] No updates detected, resetting connection...');
        cleanup();
        store.resetTokens();
        initializePumpPortalWebSocket();
      }
    }, 10000);

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
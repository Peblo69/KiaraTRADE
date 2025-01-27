import { create } from 'zustand';
import { preloadTokenImages } from './token-metadata';
import axios from 'axios';
import { TokenAnalysis } from '@/lib/token-analysis';

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
  devWallet?: string;
  recentTrades: TokenTrade[];
  analysis?: TokenAnalysis; 
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
  updateTokenAnalysis: (address: string, analysis: TokenAnalysis) => void; 
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

      // Include analysis data if available
      if (tokenData.analysis) {
        newToken.analysis = tokenData.analysis;
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

      // Update existing token while preserving dev wallet
      if (existingTokenIndex >= 0) {
        const updatedTokens = state.tokens.map((t, i) => {
          if (i === existingTokenIndex) {
            // Keep existing devWallet if present, otherwise use new one
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

      // Get existing token
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

        // Check if this is a dev wallet transaction (either as trader or counterparty)
        const isDevWallet = updatedToken.devWallet && (
          updatedToken.devWallet === tradeData.traderPublicKey ||
          updatedToken.devWallet === tradeData.counterpartyPublicKey
        );

        if (isDevWallet) {
          console.log('[PumpPortal] Dev wallet activity detected:', {
            token: address,
            type: tradeData.txType,
            wallet: tradeData.traderPublicKey === updatedToken.devWallet ? 
                   tradeData.traderPublicKey : tradeData.counterpartyPublicKey
          });
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
    const updatedTokens = state.tokens.map(token => 
      token.address === address ? { ...token, analysis } : token
    );

    const updates: Partial<PumpPortalStore> = {
      tokens: updatedTokens,
      lastUpdate: Date.now()
    };

    // If token is being viewed, update viewedTokens as well
    if (state.viewedTokens[address]) {
      updates.viewedTokens = {
        ...state.viewedTokens,
        [address]: { ...state.viewedTokens[address], analysis }
      };
    }

    return updates as any;
  }),
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
  return 100; 
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
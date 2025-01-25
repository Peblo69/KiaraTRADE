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
  traderPublicKey: string;       // The user who initiated the tx
  counterpartyPublicKey: string; // The other side of the trade
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

  addToken: (tokenData) =>
    set((state) => {
      const newToken = mapTokenData(tokenData);

      // If txType === 'create', set devWallet from traderPublicKey
      if (tokenData.txType === 'create') {
        console.log('[PumpPortal] New token detected:', tokenData.mint);
        if (tokenData.traderPublicKey) {
          console.log('[PumpPortal] Setting creator wallet:', tokenData.traderPublicKey);
          newToken.devWallet = tokenData.traderPublicKey;
        }
      }

      const existingTokenIndex = state.tokens.findIndex((t) => t.address === newToken.address);
      const isViewed = state.activeTokenView === newToken.address;

      // If token already exists, update it (preserving devWallet if it exists)
      if (existingTokenIndex >= 0) {
        const updatedTokens = state.tokens.map((t, i) => {
          if (i === existingTokenIndex) {
            return {
              ...t,
              ...newToken,
              devWallet: t.devWallet || newToken.devWallet,
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
              },
            },
            lastUpdate: Date.now(),
          };
        }

        return { tokens: updatedTokens, lastUpdate: Date.now() };
      }

      // If it's a genuinely new token, push to the front and limit to 50 tokens
      const updatedTokens = [newToken, ...state.tokens].filter(
        (t, i) => i < MAX_TOKENS_IN_LIST || t.address === state.activeTokenView
      );

      return {
        tokens: updatedTokens,
        lastUpdate: Date.now(),
        ...(isViewed && {
          viewedTokens: {
            ...state.viewedTokens,
            [newToken.address]: newToken,
          },
        }),
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
        marketCapSol: tradeData.marketCapSol,
      };

      // Find existing token (either in viewedTokens or tokens list)
      const existingToken =
        state.viewedTokens[address] || state.tokens.find((t) => t.address === address);

      if (!existingToken) return state; // No token found, do nothing

      const updateToken = (token: PumpPortalToken): PumpPortalToken => {
        let updatedToken = { ...token };

        // If devWallet not yet set, and this is the first trade (token.recentTrades.length === 0),
        // and it's a 'buy', we assume the dev is the seller
        if (
          !updatedToken.devWallet &&
          tradeData.txType === 'buy' &&
          token.recentTrades.length === 0
        ) {
          console.log('[PumpPortal] Setting dev wallet from first buy:', {
            token: address,
            wallet: tradeData.counterpartyPublicKey, // The seller is presumably the dev
          });
          updatedToken.devWallet = tradeData.counterpartyPublicKey;
        }

        // Enhanced dev wallet tracking
        const isDevWallet = updatedToken.devWallet && (
          updatedToken.devWallet === tradeData.traderPublicKey ||
          updatedToken.devWallet === tradeData.counterpartyPublicKey
        );

        // Track if dev is buying (they are trader) or selling (they are counterparty)
        const isDevBuying = isDevWallet && tradeData.txType === 'buy' && 
          updatedToken.devWallet === tradeData.traderPublicKey;
        const isDevSelling = isDevWallet && (
          (tradeData.txType === 'sell' && updatedToken.devWallet === tradeData.traderPublicKey) ||
          (tradeData.txType === 'buy' && updatedToken.devWallet === tradeData.counterpartyPublicKey)
        );

        if (isDevWallet) {
          console.log('[PumpPortal] Dev wallet activity detected:', {
            token: address,
            type: tradeData.txType,
            action: isDevBuying ? 'buying' : 'selling',
            devWallet: updatedToken.devWallet,
            trader: tradeData.traderPublicKey,
            counterparty: tradeData.counterpartyPublicKey
          });
        }

        return {
          ...updatedToken,
          recentTrades: [newTrade, ...token.recentTrades].slice(0, MAX_TRADES_PER_TOKEN),
          bondingCurveKey: tradeData.bondingCurveKey,
          vTokensInBondingCurve: tradeData.vTokensInBondingCurve,
          vSolInBondingCurve: tradeData.vSolInBondingCurve,
          marketCapSol: tradeData.marketCapSol,
        };
      };

      const isViewed = state.activeTokenView === address;
      const updates: Partial<PumpPortalStore> = {
        tokens: state.tokens.map((t) => (t.address === address ? updateToken(t) : t)),
        lastUpdate: Date.now(),
      };

      if (isViewed) {
        updates.viewedTokens = {
          ...state.viewedTokens,
          [address]: updateToken(existingToken),
        };
      }

      return updates as any;
    }),

  setConnected: (connected) => set({ isConnected: connected, lastUpdate: Date.now() }),
  setSolPrice: (price) => set({ solPrice: price, lastUpdate: Date.now() }),

  resetTokens: () =>
    set({
      tokens: [],
      viewedTokens: {},
      activeTokenView: null,
      lastUpdate: Date.now(),
    }),

  addToViewedTokens: (address) =>
    set((state) => {
      const token = state.tokens.find((t) => t.address === address);
      if (!token) return state;

      return {
        viewedTokens: {
          ...state.viewedTokens,
          [address]: token,
        },
        lastUpdate: Date.now(),
      };
    }),

  setActiveTokenView: (address) =>
    set((state) => {
      if (!address) {
        return {
          activeTokenView: null,
          lastUpdate: Date.now(),
        };
      }
      const token = state.tokens.find((t) => t.address === address);
      if (!token) return state;

      return {
        activeTokenView: address,
        viewedTokens: {
          ...state.viewedTokens,
          [address]: token,
        },
        lastUpdate: Date.now(),
      };
    }),

  getToken: (address) => {
    const state = get();
    return state.viewedTokens[address] || state.tokens.find((t) => t.address === address);
  },
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
    devWallet: data.devWallet, // If the server sets it explicitly
    recentTrades: [],
  };
}

// WebSocket connection logic
let ws: WebSocket | null = null;
let reconnectTimeout: NodeJS.Timeout | null = null;
let reconnectAttempts = 0;
let solPriceInterval: NodeJS.Timeout | null = null;
let connectionCheckInterval: NodeJS.Timeout | null = null;

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
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return fetchSolanaPrice(retries - 1);
    }
  }
  return 100; // fallback
};

function cleanup() {
  if (ws) {
    try {
      ws.close();
    } catch {}
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

export function initializePumpPortalWebSocket() {
  if (typeof window === 'undefined') return;

  cleanup();
  const store = usePumpPortalStore.getState();

  try {
    console.log('[PumpPortal] Initializing WebSocket...');
    ws = new WebSocket(WS_URL);

    fetchSolanaPrice().then((price) => {
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
            ws?.send(
              JSON.stringify({
                method: 'subscribeTokenTrade',
                keys: [data.mint],
              })
            );
            break;
          }
          case 'trade': {
            console.log('[PumpPortal] Trade Details:', data);
            store.addTradeToHistory(data.mint, data);
            break;
          }
          default:
            // ignore
            break;
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

    // Periodically check if we've gotten updates
    connectionCheckInterval = setInterval(() => {
      const now = Date.now();
      const storeNow = usePumpPortalStore.getState();
      // If no updates in 30 seconds, reset
      if (now - storeNow.lastUpdate > 30000) {
        console.log('[PumpPortal] No updates detected, resetting connection...');
        cleanup();
        storeNow.resetTokens();
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

if (typeof window !== 'undefined') {
  initializePumpPortalWebSocket();
}

import { create } from "zustand";
import { useHeliusStore } from './helius-websocket';
import { preloadTokenImages } from './token-metadata';
import type { TokenData } from '@/types/token';

// Debug flag
const DEBUG = false;

interface PumpPortalStore {
  tokens: TokenData[];
  isConnected: boolean;
  addToken: (token: TokenData) => void;
  setTokenVisibility: (address: string, isVisible: boolean) => void;
  setTokenActivity: (address: string, isActive: boolean) => void;
  updateLastTradeTime: (address: string) => void;
  setConnected: (connected: boolean) => void;
  getActiveTokens: () => string[];
}

export const usePumpPortalStore = create<PumpPortalStore>((set, get) => ({
  tokens: [],
  isConnected: false,

  addToken: (token) => {
    set((state) => {
      const newTokens = [token, ...state.tokens].slice(0, 20); // Keep last 20 tokens

      // Initialize Helius subscription for the new token
      const heliusStore = useHeliusStore.getState();
      heliusStore.subscribeToToken(token.address);

      return { tokens: newTokens };
    });
  },

  setTokenVisibility: (address, isVisible) =>
    set((state) => ({
      tokens: state.tokens.map(token =>
        token.address === address
          ? { ...token, isVisible }
          : token
      )
    })),

  setTokenActivity: (address, isActive) =>
    set((state) => ({
      tokens: state.tokens.map(token =>
        token.address === address
          ? { ...token, isActive }
          : token
      )
    })),

  updateLastTradeTime: (address) =>
    set((state) => ({
      tokens: state.tokens.map(token =>
        token.address === address
          ? { ...token, lastTradeTime: Date.now() }
          : token
      )
    })),

  setConnected: (connected) => set({ isConnected: connected }),

  getActiveTokens: () => {
    const state = get();
    const now = Date.now();
    const RECENT_TRADE_THRESHOLD = 5 * 60 * 1000; // 5 minutes

    return state.tokens
      .filter(token => 
        token.isVisible || // Token is visible in viewport
        token.isActive || // Token details are open
        (now - token.lastTradeTime) < RECENT_TRADE_THRESHOLD // Recent trading activity
      )
      .map(token => token.address);
  }
}));

let ws: WebSocket | null = null;
let reconnectTimeout: NodeJS.Timeout | null = null;
let reconnectAttempts = 0;
const RECONNECT_DELAY = 1000;
const MAX_RECONNECT_ATTEMPTS = 5;

async function mapPumpPortalData(data: any): Promise<TokenData> {
  try {
    if (DEBUG) console.log('[PumpPortal] Raw data received:', data);

    const { mint, name, symbol, imageLink } = data;

    return {
      symbol: symbol || mint?.slice(0, 6) || 'Unknown',
      name: name || `Token ${mint?.slice(0, 8)}`,
      address: mint || '',
      imageLink: imageLink || 'https://via.placeholder.com/150',
      isActive: false,
      isVisible: false,
      lastTradeTime: Date.now(),
    };
  } catch (error) {
    console.error('[PumpPortal] Error mapping data:', error);
    throw error;
  }
}

export function initializePumpPortalWebSocket() {
  if (typeof window === 'undefined') return;

  const store = usePumpPortalStore.getState();

  function cleanup() {
    if (reconnectTimeout) clearTimeout(reconnectTimeout);
    if (ws) {
      try {
        ws.close();
      } catch (e) {
        console.error('[PumpPortal] Error closing WebSocket:', e);
      }
      ws = null;
    }
  }

  function connect() {
    cleanup();
    try {
      console.log('[PumpPortal] Initializing WebSocket...');
      ws = new WebSocket('wss://pumpportal.fun/api/data');

      ws.onopen = () => {
        console.log('[PumpPortal] WebSocket connected');
        store.setConnected(true);
        reconnectAttempts = 0;

        // Subscribe to new token events
        if (ws?.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            method: "subscribeNewToken",
            keys: []
          }));
        }
      };

      ws.onmessage = async (event) => {
        try {
          const data = JSON.parse(event.data);
          if (DEBUG) console.log('[PumpPortal] Raw event data:', data);

          // Only process new token creation events
          if (data.txType === 'create' && data.mint) {
            try {
              // Create and add new token
              const token = await mapPumpPortalData(data);
              store.addToken(token);

              console.log(`[PumpPortal] Added new token:`, {
                symbol: token.symbol,
                address: token.address
              });

              // Preload token image if available
              if (token.imageLink) {
                preloadTokenImages([{
                  imageLink: token.imageLink,
                  symbol: token.symbol
                }]);
              }

            } catch (err) {
              console.error('[PumpPortal] Failed to process token:', err);
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
          console.log(`[PumpPortal] Attempting reconnect ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}`);
          reconnectTimeout = setTimeout(connect, RECONNECT_DELAY);
        }
      };

      ws.onerror = (error) => {
        console.error('[PumpPortal] WebSocket error:', error);
        store.setConnected(false);
      };

    } catch (error) {
      console.error('[PumpPortal] Failed to initialize WebSocket:', error);
      store.setConnected(false);

      if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttempts++;
        console.log(`[PumpPortal] Attempting reconnect ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}`);
        reconnectTimeout = setTimeout(connect, RECONNECT_DELAY);
      }
    }
  }

  // Start initial connection
  connect();

  // Cleanup on unmount
  return cleanup;
}

// Initialize connection
initializePumpPortalWebSocket();
import { create } from "zustand";
import { useHeliusStore } from './helius-websocket';
import { preloadTokenImages } from './token-metadata';
import type { TokenData } from '@/types/token';

const DEBUG = true;

// WebSocket configuration
const PING_INTERVAL = 15000; // 15 seconds
const PING_TIMEOUT = 5000;  // 5 seconds
const RECONNECT_BASE_DELAY = 1000; // Start with 1 second
const MAX_RECONNECT_DELAY = 30000; // 30 seconds

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
      const newTokens = [token, ...state.tokens].slice(0, 20);

      // Initialize Helius subscription for the new token
      const heliusStore = useHeliusStore.getState();
      if (DEBUG) console.log('[PumpPortal] Subscribing new token to Helius:', token.address);
      heliusStore.subscribeToToken(token.address);

      return { tokens: newTokens };
    });
  },

  setTokenVisibility: (address, isVisible) =>
    set((state) => ({
      tokens: state.tokens.map(token =>
        token.address === address ? { ...token, isVisible } : token
      )
    })),

  setTokenActivity: (address, isActive) =>
    set((state) => ({
      tokens: state.tokens.map(token =>
        token.address === address ? { ...token, isActive } : token
      )
    })),

  updateLastTradeTime: (address) =>
    set((state) => ({
      tokens: state.tokens.map(token =>
        token.address === address ? { ...token, lastTradeTime: Date.now() } : token
      )
    })),

  setConnected: (connected) => {
    if (DEBUG) console.log('[PumpPortal] Connection status:', connected);
    set({ isConnected: connected });
  },

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
let pingInterval: NodeJS.Timeout | null = null;
let pingTimeout: NodeJS.Timeout | null = null;
let reconnectAttempts = 0;

function heartbeat() {
  if (DEBUG) console.log('[PumpPortal] Heartbeat received');
  if (pingTimeout) clearTimeout(pingTimeout);
  pingTimeout = setTimeout(() => {
    console.log('[PumpPortal] Connection dead (ping timeout) - reconnecting...');
    ws?.close();
  }, PING_TIMEOUT);
}

function startHeartbeat() {
  if (pingInterval) clearInterval(pingInterval);
  pingInterval = setInterval(() => {
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'ping' }));
      if (DEBUG) console.log('[PumpPortal] Ping sent');
    }
  }, PING_INTERVAL);
}

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

function cleanup() {
  if (pingInterval) clearInterval(pingInterval);
  if (pingTimeout) clearTimeout(pingTimeout);
  if (ws) {
    try {
      ws.close();
    } catch (e) {
      console.error('[PumpPortal] Error closing WebSocket:', e);
    }
    ws = null;
  }
}

export function initializePumpPortalWebSocket() {
  if (typeof window === 'undefined') return;

  const store = usePumpPortalStore.getState();

  cleanup();
  try {
    if (DEBUG) console.log('[PumpPortal] Initializing WebSocket...');
    ws = new WebSocket('wss://pumpportal.fun/api/data');

    ws.onopen = () => {
      if (DEBUG) console.log('[PumpPortal] Connected');
      store.setConnected(true);
      reconnectAttempts = 0;

      // Start heartbeat
      heartbeat();
      startHeartbeat();

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
        if (DEBUG) console.log('[PumpPortal] Received:', data);

        if (data.type === 'pong') {
          heartbeat();
          return;
        }

        // Only process new token creation events
        if (data.txType === 'create' && data.mint) {
          try {
            // Create and add new token
            const token = await mapPumpPortalData(data);
            store.addToken(token);

            if (DEBUG) console.log(`[PumpPortal] Added new token:`, {
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
      console.log('[PumpPortal] Disconnected');
      cleanup();
      store.setConnected(false);

      // Exponential backoff for reconnection
      const delay = Math.min(RECONNECT_BASE_DELAY * Math.pow(2, reconnectAttempts), MAX_RECONNECT_DELAY);
      reconnectAttempts++;

      console.log(`[PumpPortal] Attempting reconnect in ${delay/1000} seconds (attempt ${reconnectAttempts})`);
      setTimeout(initializePumpPortalWebSocket, delay);
    };

    ws.onerror = (error) => {
      console.error('[PumpPortal] WebSocket error:', error);
      store.setConnected(false);
    };

  } catch (error) {
    console.error('[PumpPortal] Failed to initialize:', error);
    store.setConnected(false);

    // Exponential backoff for reconnection
    const delay = Math.min(RECONNECT_BASE_DELAY * Math.pow(2, reconnectAttempts), MAX_RECONNECT_DELAY);
    reconnectAttempts++;

    console.log(`[PumpPortal] Attempting reconnect in ${delay/1000} seconds (attempt ${reconnectAttempts})`);
    setTimeout(initializePumpPortalWebSocket, delay);
  }

  // Return cleanup function
  return cleanup;
}

// Initialize connection
initializePumpPortalWebSocket();
import { create } from 'zustand';
import { queryClient } from './queryClient';

export interface Token {
  name: string;
  symbol: string;
  price: number;
  marketCap: number;
  volume24h: number;
  holders: number;
  createdAt: Date;
  address: string;
  imageUrl?: string;
}

interface TokenStore {
  tokens: Token[];
  isConnected: boolean;
  addToken: (token: Token) => void;
  updateToken: (address: string, updates: Partial<Token>) => void;
  setConnected: (connected: boolean) => void;
}

export const useTokenStore = create<TokenStore>((set) => ({
  tokens: [],
  isConnected: false,
  addToken: (token) =>
    set((state) => ({
      tokens: [token, ...state.tokens].slice(0, 8), // Keep only latest 8 tokens
    })),
  updateToken: (address, updates) =>
    set((state) => ({
      tokens: state.tokens.map((token) =>
        token.address === address ? { ...token, ...updates } : token
      ),
    })),
  setConnected: (connected) => set({ isConnected: connected }),
}));

// Connection state management
let ws: WebSocket | null = null;
let connectionTimer: NodeJS.Timeout | null = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY = 5000;
const WS_URL = import.meta.env.VITE_PUMPPORTAL_WS_URL || 'wss://pumpportal.fun/api/data';

// Connection tracking
let hasSubscribedNewToken = false;
let hasSubscribedTokenTrade = false;

function cleanupConnection() {
  if (connectionTimer) {
    clearTimeout(connectionTimer);
    connectionTimer = null;
  }

  if (ws) {
    try {
      ws.close(1000, 'Normal closure');
    } catch (e) {
      console.error('[PumpPortal] Error closing connection:', e);
    }
    ws = null;
  }

  hasSubscribedNewToken = false;
  hasSubscribedTokenTrade = false;
}

function initializeWebSocket() {
  if (typeof window === 'undefined') return;

  // Skip if this is a vite-hmr connection
  if (window.location.protocol === 'ws:' || window.location.pathname.includes('__vite')) {
    console.log('[PumpPortal] Skipping vite-hmr connection');
    return;
  }

  const store = useTokenStore.getState();

  // Clean up any existing connection
  cleanupConnection();

  try {
    console.log('[PumpPortal] Initializing WebSocket connection...');
    ws = new WebSocket(WS_URL);

    ws.onopen = () => {
      console.log('[PumpPortal] Connected to WebSocket');
      store.setConnected(true);
      reconnectAttempts = 0;

      // Subscribe to events with delay
      setTimeout(() => {
        if (ws?.readyState === WebSocket.OPEN && !hasSubscribedNewToken) {
          try {
            ws.send(JSON.stringify({
              method: "subscribeNewToken"
            }));
            hasSubscribedNewToken = true;
            console.log('[PumpPortal] Subscribed to new token events');

            // Wait before sending second subscription
            setTimeout(() => {
              if (ws?.readyState === WebSocket.OPEN && !hasSubscribedTokenTrade) {
                ws.send(JSON.stringify({
                  method: "subscribeTokenTrades",
                  keys: [] // Empty array to subscribe to all token trades
                }));
                hasSubscribedTokenTrade = true;
                console.log('[PumpPortal] Subscribed to token trade events');
              }
            }, 5000); // 5 second delay between subscriptions
          } catch (error) {
            console.error('[PumpPortal] Error sending subscriptions:', error);
          }
        }
      }, 2000); // Initial 2 second delay
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.message?.includes('Successfully subscribed')) {
          console.log('[PumpPortal] Subscription confirmed:', data.message);
          return;
        }

        if (data.type === 'newToken' && data.token) {
          const token: Token = {
            name: data.token.name || `Token ${data.token.address.slice(0, 8)}`,
            symbol: data.token.symbol || `PUMP${data.token.address.slice(0, 4)}`,
            price: Number(data.token.price || 0),
            marketCap: Number(data.token.price || 0) * 1_000_000_000,
            volume24h: 0,
            holders: 0,
            createdAt: new Date(),
            address: data.token.address,
            imageUrl: data.token.image || undefined,
          };
          store.addToken(token);
          console.log('[PumpPortal] Added new token:', token.name);
        }
        else if (data.type === 'tokenTrade' && data.trade) {
          store.updateToken(data.trade.tokenAddress, {
            price: Number(data.trade.price || 0),
            marketCap: Number(data.trade.price || 0) * 1_000_000_000,
            volume24h: Number(data.trade.volume24h || 0),
          });
          console.log('[PumpPortal] Updated token:', data.trade.tokenAddress);
        }
      } catch (error) {
        console.error('[PumpPortal] Failed to parse message:', error);
      }
    };

    ws.onclose = (event) => {
      if (event.code === 1000) {
        console.log('[PumpPortal] WebSocket closed normally');
      } else {
        console.log(`[PumpPortal] WebSocket disconnected (${event.code}): ${event.reason || 'No reason provided'}`);
      }

      store.setConnected(false);
      cleanupConnection();

      if (event.code !== 1000 && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        const delay = RECONNECT_DELAY * Math.pow(2, reconnectAttempts);
        reconnectAttempts++;
        console.log(`[PumpPortal] Will attempt to reconnect in ${delay/1000}s (attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`);
        connectionTimer = setTimeout(initializeWebSocket, delay);
      } else if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
        console.error('[PumpPortal] Max reconnection attempts reached');
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
      const delay = RECONNECT_DELAY * Math.pow(2, reconnectAttempts);
      reconnectAttempts++;
      console.log(`[PumpPortal] Will attempt to reconnect in ${delay/1000}s (attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`);
      connectionTimer = setTimeout(initializeWebSocket, delay);
    }
  }
}

// Initialize connection when in browser environment
if (typeof window !== 'undefined') {
  // Add cleanup handler
  window.addEventListener('beforeunload', cleanupConnection);

  // Initial connection with delay
  setTimeout(initializeWebSocket, 2000);
}

// Function to fetch initial token data
export async function fetchRealTimeTokens(): Promise<Token[]> {
  try {
    // For now, return empty array since the REST API might also be rate limited
    return [];
  } catch (error) {
    console.error('[PumpPortal] Error fetching tokens:', error);
    return [];
  }
}
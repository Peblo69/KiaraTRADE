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

let ws: WebSocket | null = null;
let reconnectTimeout: NodeJS.Timeout | null = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY = 5000;
const WS_URL = import.meta.env.VITE_PUMPPORTAL_WS_URL || 'wss://pumpportal.fun/api/data';

// Connection tracking
let lastConnectionTime = 0;
let hasSubscribedNewToken = false;
let hasSubscribedTokenTrade = false;

function initializeWebSocket() {
  if (typeof window === 'undefined') return;

  // Skip if this is a vite-hmr connection
  if (typeof window !== 'undefined' && 
      (window.location.protocol === 'ws:' || window.location.pathname.includes('__vite'))) {
    console.log('[PumpPortal] Skipping vite-hmr connection');
    return;
  }

  // Rate limiting: Only attempt reconnection if enough time has passed
  const now = Date.now();
  const timeSinceLastConnection = now - lastConnectionTime;
  if (timeSinceLastConnection < RECONNECT_DELAY) {
    console.log(`[PumpPortal] Rate limiting: waiting ${(RECONNECT_DELAY - timeSinceLastConnection)/1000}s before next connection`);
    reconnectTimeout = setTimeout(initializeWebSocket, RECONNECT_DELAY - timeSinceLastConnection);
    return;
  }

  const store = useTokenStore.getState();

  // Clear any existing connection attempts
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
    reconnectTimeout = null;
  }

  // Close existing connection if any
  if (ws) {
    try {
      ws.close();
    } catch (e) {
      console.error('[PumpPortal] Error closing WebSocket:', e);
    }
    ws = null;
  }

  try {
    console.log('[PumpPortal] Initializing WebSocket connection...');
    ws = new WebSocket(WS_URL);
    lastConnectionTime = Date.now();

    ws.onopen = () => {
      console.log('[PumpPortal] Connected to WebSocket');
      store.setConnected(true);
      reconnectAttempts = 0;
      hasSubscribedNewToken = false;
      hasSubscribedTokenTrade = false;

      // Add significant delay before subscribing to avoid overwhelming the server
      setTimeout(() => {
        if (ws?.readyState === WebSocket.OPEN && !hasSubscribedNewToken) {
          try {
            ws.send(JSON.stringify({
              method: "subscribeNewToken"
            }));
            hasSubscribedNewToken = true;
            console.log('[PumpPortal] Subscribed to new token events');

            // Wait longer before sending second subscription
            setTimeout(() => {
              if (ws?.readyState === WebSocket.OPEN && !hasSubscribedTokenTrade) {
                ws.send(JSON.stringify({
                  method: "subscribeTokenTrades",
                  keys: [] // Empty array to subscribe to all token trades
                }));
                hasSubscribedTokenTrade = true;
                console.log('[PumpPortal] Subscribed to token trade events');
              }
            }, 10000); // 10 second delay between subscriptions
          } catch (error) {
            console.error('[PumpPortal] Error sending subscriptions:', error);
          }
        }
      }, 5000); // Wait 5 seconds after connection before first subscription
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('[PumpPortal] Received event:', data);

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
      const closeReason = event.reason || 'No reason provided';
      console.log(`[PumpPortal] WebSocket disconnected (${event.code}): ${closeReason}`);
      store.setConnected(false);
      hasSubscribedNewToken = false;
      hasSubscribedTokenTrade = false;

      if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        const delay = RECONNECT_DELAY * Math.pow(2, reconnectAttempts);
        reconnectAttempts++;
        console.log(`[PumpPortal] Will attempt to reconnect in ${delay/1000}s (attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`);
        reconnectTimeout = setTimeout(initializeWebSocket, delay);
      } else {
        console.error('[PumpPortal] Max reconnection attempts reached. Please refresh the page to try again.');
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
      reconnectTimeout = setTimeout(initializeWebSocket, delay);
    }
  }
}

// Initialize connection when in browser environment, with initial delay
if (typeof window !== 'undefined') {
  setTimeout(initializeWebSocket, 30000); // Wait 30 seconds before first attempt
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

// Pre-fetch tokens and add to store (disabled for now to avoid rate limits)
// queryClient.prefetchQuery({
//   queryKey: ['/api/tokens/recent'],
//   queryFn: fetchRealTimeTokens,
// });
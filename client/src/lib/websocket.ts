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
const MAX_RECONNECT_ATTEMPTS = 2; // Reduced max attempts to be more conservative
const BASE_RECONNECT_INTERVAL = 300000; // Start with 5 minutes
const MAX_RECONNECT_INTERVAL = 900000; // Max 15 minutes

// Connection tracking
let lastConnectionTime = 0;
let hasSubscribedNewToken = false;
let hasSubscribedTokenTrade = false;

function getReconnectDelay(): number {
  return Math.min(
    BASE_RECONNECT_INTERVAL * Math.pow(2, reconnectAttempts),
    MAX_RECONNECT_INTERVAL
  );
}

function initializeWebSocket() {
  if (typeof window === 'undefined') return;

  // Rate limiting: Only attempt reconnection if enough time has passed
  const now = Date.now();
  const timeSinceLastConnection = now - lastConnectionTime;
  if (timeSinceLastConnection < BASE_RECONNECT_INTERVAL) {
    const waitTime = BASE_RECONNECT_INTERVAL - timeSinceLastConnection;
    console.log(`[PumpPortal] Rate limiting: waiting ${waitTime/1000}s before next connection attempt`);
    reconnectTimeout = setTimeout(initializeWebSocket, waitTime);
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
    ws = new WebSocket('wss://pumpportal.fun/api/data');
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
                  method: "subscribeTokenTrade",
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

      // Special handling for rejection codes
      if (event.code === 1008 || event.code === 1011) {
        console.error('[PumpPortal] Server rejected connection, extending delay before retry');
        reconnectAttempts = MAX_RECONNECT_ATTEMPTS; // Force maximum delay
        return; // Don't attempt to reconnect immediately
      }

      if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        const delay = getReconnectDelay();
        reconnectAttempts++;
        console.log(`[PumpPortal] Will attempt to reconnect in ${delay/1000}s (attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`);
        reconnectTimeout = setTimeout(initializeWebSocket, delay);
      } else {
        console.error('[PumpPortal] Max reconnection attempts reached. Please refresh the page later to try again.');
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
      const delay = getReconnectDelay();
      reconnectAttempts++;
      console.log(`[PumpPortal] Will attempt to reconnect in ${delay/1000}s (attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`);
      reconnectTimeout = setTimeout(initializeWebSocket, delay);
    }
  }
}

// Initialize connection when in browser
if (typeof window !== 'undefined') {
  // Add significant initial delay before first connection attempt
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
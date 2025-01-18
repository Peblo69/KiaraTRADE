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
const RECONNECT_INTERVAL = 5000;

function initializeWebSocket() {
  if (typeof window === 'undefined') return;

  const store = useTokenStore.getState();

  // Clear any existing reconnect timeout
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

    ws.onopen = () => {
      console.log('[PumpPortal] Connected to WebSocket');
      store.setConnected(true);
      reconnectAttempts = 0; // Reset reconnect attempts on successful connection

      // Subscribe to token creation events
      if (ws && ws.readyState === WebSocket.OPEN) {
        try {
          // Subscribe to new token creation events
          ws.send(JSON.stringify({
            method: "subscribeNewToken"
          }));
          console.log('[PumpPortal] Subscribed to new token events');

          // Subscribe to all token trades
          ws.send(JSON.stringify({
            method: "subscribeTokenTrade",
            keys: [] // Empty array to subscribe to all token trades
          }));
          console.log('[PumpPortal] Subscribed to token trade events');
        } catch (error) {
          console.error('[PumpPortal] Error sending subscriptions:', error);
        }
      }
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
            marketCap: Number(data.token.price || 0) * 1_000_000_000, // All pump tokens have 1B supply
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
      console.log('[PumpPortal] WebSocket disconnected:', event.code, event.reason);
      store.setConnected(false);

      if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttempts++;
        console.log(`[PumpPortal] Attempting to reconnect (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`);
        reconnectTimeout = setTimeout(initializeWebSocket, RECONNECT_INTERVAL);
      } else {
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
      reconnectAttempts++;
      console.log(`[PumpPortal] Attempting to reconnect (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`);
      reconnectTimeout = setTimeout(initializeWebSocket, RECONNECT_INTERVAL);
    }
  }
}

// Initialize connection when in browser
if (typeof window !== 'undefined') {
  initializeWebSocket();
}

// Function to fetch initial token data
export async function fetchRealTimeTokens(): Promise<Token[]> {
  try {
    const response = await fetch('https://pumpportal.fun/api/tokens/recent');
    if (!response.ok) {
      throw new Error('Failed to fetch token data');
    }
    const data = await response.json();
    return data.tokens.slice(0, 8).map((token: any) => ({
      name: token.name || `Token ${token.address.slice(0, 8)}`,
      symbol: token.symbol || `PUMP${token.address.slice(0, 4)}`,
      price: Number(token.price || 0),
      marketCap: Number(token.price || 0) * 1_000_000_000,
      volume24h: Number(token.volume24h || 0),
      holders: Number(token.holders || 0),
      createdAt: new Date(token.createdAt),
      address: token.address,
      imageUrl: token.image || undefined,
    }));
  } catch (error) {
    console.error('[PumpPortal] Error fetching tokens:', error);
    return [];
  }
}

// Pre-fetch tokens and add to store
queryClient.prefetchQuery({
  queryKey: ['/api/tokens/recent'],
  queryFn: fetchRealTimeTokens,
});
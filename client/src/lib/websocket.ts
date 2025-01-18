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

// Initialize WebSocket connection
function initializeWebSocket() {
  const store = useTokenStore.getState();

  // Clear any existing reconnect timeout
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
    reconnectTimeout = null;
  }

  // Close existing connection if any
  if (ws) {
    ws.close();
    ws = null;
  }

  try {
    ws = new WebSocket('wss://pumpportal.fun/api/data');

    ws.onopen = () => {
      console.log('[PumpPortal] Connected to WebSocket');
      store.setConnected(true);

      // Only send subscriptions if ws is not null
      if (ws) {
        // Subscribe to new token creation events
        ws.send(JSON.stringify({
          method: "subscribeNewToken"
        }));

        // Subscribe to all token trades
        ws.send(JSON.stringify({
          method: "subscribeTokenTrade",
          keys: [] // Empty array to subscribe to all token trades
        }));
      }
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('[PumpPortal] Received message:', data.type);

        // Handle token creation events
        if (data.type === 'newToken') {
          const token: Token = {
            name: data.token.name || `Token ${data.token.address.slice(0, 8)}`,
            symbol: data.token.symbol || `PUMP${data.token.address.slice(0, 4)}`,
            price: data.token.price || 0,
            marketCap: (data.token.price || 0) * 1_000_000_000, // All pump tokens have 1B supply
            volume24h: 0,
            holders: 0,
            createdAt: new Date(),
            address: data.token.address,
            imageUrl: data.token.image || "https://via.placeholder.com/40",
          };
          store.addToken(token);
          console.log('[PumpPortal] New token created:', token.name);
        }

        // Handle trade updates
        else if (data.type === 'tokenTrade') {
          store.updateToken(data.trade.tokenAddress, {
            price: data.trade.price,
            marketCap: data.trade.price * 1_000_000_000,
            volume24h: data.trade.volume24h || 0,
          });
          console.log('[PumpPortal] Trade update for:', data.trade.tokenAddress);
        }
      } catch (error) {
        console.error('[PumpPortal] Failed to parse message:', error);
      }
    };

    ws.onclose = () => {
      console.log('[PumpPortal] WebSocket disconnected');
      store.setConnected(false);
      // Attempt to reconnect after 5 seconds
      reconnectTimeout = setTimeout(initializeWebSocket, 5000);
    };

    ws.onerror = (error) => {
      console.error('[PumpPortal] WebSocket error:', error);
      store.setConnected(false);
    };
  } catch (error) {
    console.error('[PumpPortal] Failed to initialize WebSocket:', error);
    // Attempt to reconnect after 5 seconds
    reconnectTimeout = setTimeout(initializeWebSocket, 5000);
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
    return data.tokens.map((token: any) => ({
      name: token.name || `Token ${token.address.slice(0, 8)}`,
      symbol: token.symbol || `PUMP${token.address.slice(0, 4)}`,
      price: token.price || 0,
      marketCap: (token.price || 0) * 1_000_000_000,
      volume24h: token.volume24h || 0,
      holders: token.holders || 0,
      createdAt: new Date(token.createdAt),
      address: token.address,
      imageUrl: token.image || "https://via.placeholder.com/40",
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
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
      tokens: [token, ...state.tokens].slice(0, 8),
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
const MAX_RECONNECT_ATTEMPTS = 2;
const BASE_RECONNECT_INTERVAL = 300000;
const MAX_RECONNECT_INTERVAL = 900000;

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

  const now = Date.now();
  const timeSinceLastConnection = now - lastConnectionTime;
  if (timeSinceLastConnection < BASE_RECONNECT_INTERVAL) {
    const waitTime = BASE_RECONNECT_INTERVAL - timeSinceLastConnection;
    reconnectTimeout = setTimeout(initializeWebSocket, waitTime);
    return;
  }

  const store = useTokenStore.getState();

  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
    reconnectTimeout = null;
  }

  if (ws) {
    try {
      ws.close();
    } catch (e) {}
    ws = null;
  }

  try {
    ws = new WebSocket('wss://pumpportal.fun/api/data');
    lastConnectionTime = Date.now();

    ws.onopen = () => {
      store.setConnected(true);
      reconnectAttempts = 0;
      hasSubscribedNewToken = false;
      hasSubscribedTokenTrade = false;

      setTimeout(() => {
        if (ws?.readyState === WebSocket.OPEN && !hasSubscribedNewToken) {
          try {
            ws.send(JSON.stringify({
              method: "subscribeNewToken"
            }));
            hasSubscribedNewToken = true;

            setTimeout(() => {
              if (ws?.readyState === WebSocket.OPEN && !hasSubscribedTokenTrade) {
                ws.send(JSON.stringify({
                  method: "subscribeTokenTrade",
                  keys: []
                }));
                hasSubscribedTokenTrade = true;
              }
            }, 10000);

          } catch (error) {}
        }
      }, 5000);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

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
        }
        else if (data.type === 'tokenTrade' && data.trade) {
          store.updateToken(data.trade.tokenAddress, {
            price: Number(data.trade.price || 0),
            marketCap: Number(data.trade.price || 0) * 1_000_000_000,
            volume24h: Number(data.trade.volume24h || 0),
          });
        }
      } catch (error) {}
    };

    ws.onclose = () => {
      store.setConnected(false);
      hasSubscribedNewToken = false;
      hasSubscribedTokenTrade = false;

      if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        const delay = getReconnectDelay();
        reconnectAttempts++;
        reconnectTimeout = setTimeout(initializeWebSocket, delay);
      }
    };

    ws.onerror = () => {
      store.setConnected(false);
    };
  } catch (error) {
    store.setConnected(false);

    if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
      const delay = getReconnectDelay();
      reconnectAttempts++;
      reconnectTimeout = setTimeout(initializeWebSocket, delay);
    }
  }
}

if (typeof window !== 'undefined') {
  setTimeout(initializeWebSocket, 30000);
}

export async function fetchRealTimeTokens(): Promise<Token[]> {
  try {
    return [];
  } catch {
    return [];
  }
}
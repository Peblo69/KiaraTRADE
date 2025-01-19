import { create } from 'zustand';

// Types for PumpPortal data
export interface PumpPortalToken {
  symbol: string;
  name: string;
  address: string;
  liquidity: number;
  liquidityChange: number;
  l1Liquidity: number;
  marketCap: number;
  volume: number;
  swaps: number;
  timestamp: number;
  status: {
    mad: boolean;
    fad: boolean;
    lb: boolean;
    tri: boolean;
  }
}

interface PumpPortalStore {
  tokens: PumpPortalToken[];
  isConnected: boolean;
  addToken: (token: PumpPortalToken) => void;
  updateToken: (address: string, updates: Partial<PumpPortalToken>) => void;
  setConnected: (connected: boolean) => void;
}

export const usePumpPortalStore = create<PumpPortalStore>((set) => ({
  tokens: [],
  isConnected: false,
  addToken: (token) =>
    set((state) => ({
      tokens: [token, ...state.tokens].slice(0, 10), // Keep only latest 10 tokens
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
const MAX_RECONNECT_ATTEMPTS = 3;
const RECONNECT_DELAY = 5000;

function mapPumpPortalData(data: any): PumpPortalToken {
  return {
    symbol: data.symbol || 'Unknown',
    name: data.name || 'Unknown Token',
    address: data.address || '',
    liquidity: Number(data.liquidity || 0),
    liquidityChange: Number(data.liquidityChange || 0),
    l1Liquidity: Number(data.l1Liquidity || 0),
    marketCap: Number(data.marketCap || 0),
    volume: Number(data.volume || 0),
    swaps: Number(data.swaps || 0),
    timestamp: data.timestamp || Date.now(),
    status: {
      mad: Boolean(data.status?.mad),
      fad: Boolean(data.status?.fad),
      lb: Boolean(data.status?.lb),
      tri: Boolean(data.status?.tri),
    }
  };
}

export function initializePumpPortalWebSocket() {
  if (typeof window === 'undefined') return;

  const store = usePumpPortalStore.getState();

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

    ws.onopen = () => {
      console.log('[PumpPortal] Connected to WebSocket');
      store.setConnected(true);

      // Subscribe to token updates
      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          method: "subscribeNewToken"
        }));
        console.log('[PumpPortal] Subscribed to new token events');
      }
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('[PumpPortal] Received event:', data);

        if (data.type === 'newToken' && data.token) {
          const token = mapPumpPortalData(data.token);
          store.addToken(token);
          console.log('[PumpPortal] Added new token:', token.symbol);
        }
        else if (data.type === 'tokenUpdate' && data.token) {
          const updates = mapPumpPortalData(data.token);
          store.updateToken(data.token.address, updates);
          console.log('[PumpPortal] Updated token:', data.token.address);
        }
      } catch (error) {
        console.error('[PumpPortal] Failed to parse message:', error);
      }
    };

    ws.onclose = () => {
      console.log('[PumpPortal] WebSocket disconnected');
      store.setConnected(false);

      // Attempt to reconnect
      reconnectTimeout = setTimeout(initializePumpPortalWebSocket, RECONNECT_DELAY);
    };

    ws.onerror = (error) => {
      console.error('[PumpPortal] WebSocket error:', error);
      store.setConnected(false);
    };

  } catch (error) {
    console.error('[PumpPortal] Failed to initialize WebSocket:', error);
    store.setConnected(false);
  }
}

// Initialize connection when in browser
if (typeof window !== 'undefined') {
  initializePumpPortalWebSocket();
}
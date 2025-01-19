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
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 2;
const RECONNECT_DELAY = 5000;

// For now use a temporary SOL price until we integrate Helius
const TEMP_SOL_PRICE_USD = 100; // Temporary value
const TOTAL_SUPPLY = 1_000_000_000; // Fixed total supply for PumpFun tokens

function mapPumpPortalData(data: any): PumpPortalToken {
  try {
    console.log('[PumpPortal] Raw data received:', data);

    // Extract basic token info
    const mint = data.mint || '';
    const initialBuy = data.initialBuy ? Number(data.initialBuy) : 0;

    // Calculate metrics
    const pricePerTokenSol = initialBuy > 0 ? initialBuy / TOTAL_SUPPLY : 0;
    const pricePerTokenUsd = pricePerTokenSol * TEMP_SOL_PRICE_USD;
    const marketCapUsd = pricePerTokenUsd * TOTAL_SUPPLY;
    const liquidityUsd = initialBuy * TEMP_SOL_PRICE_USD;

    const token: PumpPortalToken = {
      symbol: mint.slice(0, 6) || 'Unknown',
      name: `Token ${mint.slice(0, 8)}`,
      address: mint,
      liquidity: liquidityUsd,
      liquidityChange: 0,
      l1Liquidity: liquidityUsd,
      marketCap: marketCapUsd,
      volume: initialBuy * TEMP_SOL_PRICE_USD,
      swaps: 0,
      timestamp: Date.now(),
      status: {
        mad: false,
        fad: false,
        lb: true,
        tri: false,
      }
    };

    console.log('[PumpPortal] Mapped token:', token);
    return token;

  } catch (error) {
    console.error('[PumpPortal] Error mapping data:', error, data);
    throw error;
  }
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
      reconnectAttempts = 0;

      // Subscribe to token updates
      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          method: "subscribeNewToken"
        }));
        console.log('[PumpPortal] Subscribed to new token events');

        // Also subscribe to trade events
        ws.send(JSON.stringify({
          method: "subscribeTokenTrade"
        }));
        console.log('[PumpPortal] Subscribed to token trade events');
      }
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('[PumpPortal] Received event:', data);

        // Skip subscription confirmation messages
        if (data.message && data.message.includes('Successfully subscribed')) {
          return;
        }

        if (data.mint && data.txType === 'create') {
          try {
            const token = mapPumpPortalData(data);
            store.addToken(token);
            console.log('[PumpPortal] Added new token:', token.symbol);
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

      // Attempt to reconnect
      if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttempts++;
        console.log(`[PumpPortal] Attempting reconnect ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}`);
        reconnectTimeout = setTimeout(initializePumpPortalWebSocket, RECONNECT_DELAY);
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
      reconnectTimeout = setTimeout(initializePumpPortalWebSocket, RECONNECT_DELAY);
    }
  }
}

// Initialize connection when in browser
if (typeof window !== 'undefined') {
  initializePumpPortalWebSocket();
}
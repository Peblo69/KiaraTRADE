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
  // Calculate liquidity based on available data
  const vSolInBondingCurve = data.vSolInBondingCurve ? Number(data.vSolInBondingCurve) : 0;
  const solAmount = data.solAmount ? Number(data.solAmount) : 0;

  // Calculate price per token in SOL
  const pricePerTokenSol = solAmount / (data.initialBuy || 1);

  // Convert to USD
  const pricePerTokenUsd = pricePerTokenSol * TEMP_SOL_PRICE_USD;
  const liquidityUsd = vSolInBondingCurve * TEMP_SOL_PRICE_USD;
  const marketCapUsd = pricePerTokenUsd * TOTAL_SUPPLY;

  // Calculate initial volume in USD
  const volumeUsd = data.initialBuy ? Number(data.initialBuy) * pricePerTokenUsd : 0;

  return {
    symbol: data.symbol || data.mint?.slice(0, 6) || 'Unknown',
    name: data.name || 'Unknown Token',
    address: data.mint || '',
    liquidity: liquidityUsd,
    liquidityChange: 0, // Will be calculated with trade events
    l1Liquidity: data.bondingCurveKey ? liquidityUsd : 0,
    marketCap: marketCapUsd,
    volume: volumeUsd,
    swaps: 0, // Will be updated with trade events
    timestamp: Date.now(),
    status: {
      mad: false,
      fad: false,
      lb: Boolean(data.bondingCurveKey),
      tri: false,
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
      reconnectAttempts = 0;

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

        if (data.txType === 'create') {
          const token = mapPumpPortalData(data);
          store.addToken(token);
          console.log('[PumpPortal] Added new token:', token.symbol);
        }
        // Handle trade updates here when implemented
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
  }
}

// Initialize connection when in browser
if (typeof window !== 'undefined') {
  initializePumpPortalWebSocket();
}
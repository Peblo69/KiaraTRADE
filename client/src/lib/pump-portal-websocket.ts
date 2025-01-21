import { create } from "zustand";
import axios from "axios";

// -----------------------------------
// TYPES
// -----------------------------------
export interface PumpPortalToken {
  symbol: string;
  name: string;
  address: string;
  marketCap: number; 
  price: number;     
  liquidity: number;
  liquidityChange: number;
  l1Liquidity: number;
  volume: number;
  swaps: number;
  timestamp: number;
  status: {
    mad: boolean;
    fad: boolean;
    lb: boolean;
    tri: boolean;
  };
}

// Zustand store interface
interface PumpPortalStore {
  tokens: PumpPortalToken[];
  isConnected: boolean;
  addToken: (token: PumpPortalToken) => void;
  setConnected: (connected: boolean) => void;
}

// -----------------------------------
// ZUSTAND STORE
// -----------------------------------
export const usePumpPortalStore = create<PumpPortalStore>((set) => ({
  tokens: [],
  isConnected: false,
  addToken: (token) =>
    set((state) => ({
      tokens: [token, ...state.tokens].slice(0, 10), // Keep only the last 10 tokens
    })),
  setConnected: (connected) => set({ isConnected: connected }),
}));

// -----------------------------------
// CONSTANTS
// -----------------------------------
const TEMP_SOL_PRICE_USD = 100; // Temporary SOL price for calculations
const TOTAL_SUPPLY = 1_000_000_000; // Fixed total supply for PumpFun tokens

function mapPumpPortalData(data: any): PumpPortalToken {
  try {
    console.log('[PumpPortal] Raw data received:', data);

    // Extract all the values with proper defaults
    const vSolInBondingCurve = Number(data.vSolInBondingCurve || 0);
    const initialBuy = Number(data.initialBuy || 0);
    const marketCapSol = Number(data.marketCapSol || 0);

    // Convert all SOL values to USD using our temporary price
    const liquidityUsd = vSolInBondingCurve * TEMP_SOL_PRICE_USD;
    const volumeUsd = initialBuy * TEMP_SOL_PRICE_USD;
    const marketCapUsd = marketCapSol * TEMP_SOL_PRICE_USD;

    // Calculate price from marketCap
    const priceUsd = marketCapUsd / TOTAL_SUPPLY;

    const token: PumpPortalToken = {
      // Use the provided name/symbol, or create from mint address
      symbol: data.symbol || data.mint?.slice(0, 6) || 'Unknown',
      name: data.name || `Token ${data.mint?.slice(0, 8)}`,
      address: data.mint || '',
      // Financial metrics
      price: priceUsd,
      marketCap: marketCapUsd,
      liquidity: liquidityUsd,
      liquidityChange: 0,
      l1Liquidity: liquidityUsd, // Same as liquidity for now
      volume: volumeUsd,
      swaps: 0,
      timestamp: Date.now(),
      // Status flags
      status: {
        mad: false,
        fad: false,
        lb: Boolean(data.bondingCurveKey),
        tri: false,
      }
    };

    console.log('[PumpPortal] Mapped token:', token);
    return token;

  } catch (error) {
    console.error('[PumpPortal] Error mapping data:', error, data);
    // Return a basic token instead of throwing
    return {
      symbol: data.mint?.slice(0, 6) || 'Unknown',
      name: 'Unknown Token',
      address: data.mint || '',
      price: 0,
      marketCap: 0,
      liquidity: 0,
      liquidityChange: 0,
      l1Liquidity: 0,
      volume: 0,
      swaps: 0,
      timestamp: Date.now(),
      status: { mad: false, fad: false, lb: false, tri: false }
    };
  }
}

let ws: WebSocket | null = null;
let reconnectTimeout: NodeJS.Timeout | null = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY = 5000;

export function initializePumpPortalWebSocket() {
  if (typeof window === 'undefined') return;

  const store = usePumpPortalStore.getState();

  // Clean up existing connection
  if (ws) {
    try {
      ws.close();
    } catch (e) {
      console.error('[PumpPortal] Error closing WebSocket:', e);
    }
    ws = null;
  }

  try {
    console.log('[PumpPortal] Initializing WebSocket...');
    ws = new WebSocket('wss://pumpportal.fun/api/data');

    ws.onopen = () => {
      console.log('[PumpPortal] WebSocket connected.');
      store.setConnected(true);
      reconnectAttempts = 0;

      // Subscribe to new token events
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

        // Handle new token creation
        if (data.mint && data.txType === 'create') {
          try {
            const token = mapPumpPortalData(data);
            store.addToken(token);
            console.log('[PumpPortal] Added new token:', token.symbol);
          } catch (err) {
            console.error('[PumpPortal] Failed to process token:', err);
          }
        }

        // Handle trade events (to be implemented)
        if (data.txType === 'trade') {
          // Update volume and swaps in future implementation
        }
      } catch (error) {
        console.error('[PumpPortal] Failed to parse message:', error);
      }
    };

    ws.onclose = () => {
      console.log('[PumpPortal] WebSocket disconnected');
      store.setConnected(false);

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

// Initialize the WebSocket connection
initializePumpPortalWebSocket();
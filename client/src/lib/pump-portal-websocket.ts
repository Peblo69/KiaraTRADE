import { create } from "zustand";
import axios from "axios";

// -----------------------------------
// TYPES
// -----------------------------------
export interface PumpPortalToken {
  symbol: string;
  name: string;
  address: string;
  price: number;     
  marketCap: number;
  liquidity: number;
  liquidityChange: number;
  l1Liquidity: number;
  volume: number;
  swaps: number;
  timestamp: number;
  status: {
    mad: boolean;
    fad: false;
    lb: boolean;
    tri: boolean;
  };
}

interface PumpPortalStore {
  tokens: PumpPortalToken[];
  isConnected: boolean;
  solPrice: number | null;
  addToken: (token: PumpPortalToken) => void;
  updateToken: (address: string, updates: Partial<PumpPortalToken>) => void;
  setConnected: (connected: boolean) => void;
  setSolPrice: (price: number) => void;
}

// -----------------------------------
// CONSTANTS
// -----------------------------------
const TOTAL_SUPPLY = 1_000_000_000; // Fixed 1 billion supply for all PumpFun tokens
const COINGECKO_API = "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd";
const CACHE_DURATION = 30000; // 30 seconds cache

// Cache mechanism for SOL price
let cachedSolPrice: number | null = null;
let lastPriceUpdate = 0;

async function fetchSolPrice(): Promise<number> {
  const now = Date.now();

  // Return cached price if still valid
  if (cachedSolPrice && (now - lastPriceUpdate < CACHE_DURATION)) {
    return cachedSolPrice;
  }

  try {
    const response = await axios.get(COINGECKO_API);
    const price = response.data?.solana?.usd;

    if (price) {
      cachedSolPrice = price;
      lastPriceUpdate = now;
      console.log('[PumpPortal] Updated SOL price:', price);
      return price;
    }
  } catch (error) {
    console.error('[PumpPortal] Error fetching SOL price:', error);
  }

  // Return last known price or fallback
  return cachedSolPrice || 100;
}

// -----------------------------------
// STORE
// -----------------------------------
export const usePumpPortalStore = create<PumpPortalStore>((set) => ({
  tokens: [],
  isConnected: false,
  solPrice: null,
  addToken: (token) =>
    set((state) => ({
      tokens: [token, ...state.tokens].slice(0, 10),
    })),
  updateToken: (address, updates) =>
    set((state) => ({
      tokens: state.tokens.map((token) =>
        token.address === address ? { ...token, ...updates } : token
      ),
    })),
  setConnected: (connected) => set({ isConnected: connected }),
  setSolPrice: (price) => set({ solPrice: price }),
}));

async function mapPumpPortalData(data: any): Promise<PumpPortalToken> {
  try {
    console.log('[PumpPortal] Raw data received:', data);

    const solPrice = await fetchSolPrice();

    // Get values from PumpPortal with defaults
    const vSolInBondingCurve = Number(data.vSolInBondingCurve || 0);
    const initialBuy = Number(data.initialBuy || 0);

    // Calculate metrics
    const liquiditySol = vSolInBondingCurve;
    const liquidityUsd = liquiditySol * solPrice;
    const volumeUsd = initialBuy * solPrice;

    // Calculate price per token (in SOL and USD)
    const pricePerTokenSol = vSolInBondingCurve / TOTAL_SUPPLY;
    const pricePerTokenUsd = pricePerTokenSol * solPrice;

    // Calculate market cap
    const marketCapUsd = pricePerTokenUsd * TOTAL_SUPPLY;

    const token: PumpPortalToken = {
      symbol: data.symbol || data.mint?.slice(0, 6) || 'Unknown',
      name: data.name || `Token ${data.mint?.slice(0, 8)}`,
      address: data.mint || '',
      price: pricePerTokenUsd,
      marketCap: marketCapUsd,
      liquidity: liquidityUsd,
      liquidityChange: 0,
      l1Liquidity: liquidityUsd,
      volume: volumeUsd,
      swaps: 0,
      timestamp: Date.now(),
      status: {
        mad: false,
        fad: false,
        lb: Boolean(data.bondingCurveKey),
        tri: false,
      }
    };

    console.log('[PumpPortal] Mapped token:', token);
    usePumpPortalStore.getState().setSolPrice(solPrice);
    return token;

  } catch (error) {
    console.error('[PumpPortal] Error mapping data:', error, data);
    throw error;
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

      if (ws?.readyState === WebSocket.OPEN) {
        // Subscribe to new token events
        ws.send(JSON.stringify({
          method: "subscribeNewToken"
        }));
        console.log('[PumpPortal] Subscribed to new token events');

        // Subscribe to trade events
        ws.send(JSON.stringify({
          method: "subscribeTokenTrade"
        }));
        console.log('[PumpPortal] Subscribed to token trade events');
      }
    };

    ws.onmessage = async (event) => {
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
            const token = await mapPumpPortalData(data);
            store.addToken(token);
            console.log('[PumpPortal] Added new token:', token.symbol);
          } catch (err) {
            console.error('[PumpPortal] Failed to process token:', err);
          }
        }

        // Handle trade events
        if (data.txType === 'trade' && data.mint) {
          const existingToken = store.tokens.find(t => t.address === data.mint);
          if (existingToken) {
            store.updateToken(data.mint, {
              swaps: (existingToken.swaps || 0) + 1,
              volume: (existingToken.volume || 0) + Number(data.tradeVolume || 0),
            });
          }
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
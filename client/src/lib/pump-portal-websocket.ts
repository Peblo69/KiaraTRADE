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
  setConnected: (connected: boolean) => void;
  setSolPrice: (price: number) => void;
}

// -----------------------------------
// ZUSTAND STORE
// -----------------------------------
export const usePumpPortalStore = create<PumpPortalStore>((set) => ({
  tokens: [],
  isConnected: false,
  solPrice: null,
  addToken: (token) =>
    set((state) => ({
      tokens: [token, ...state.tokens].slice(0, 10),
    })),
  setConnected: (connected) => set({ isConnected: connected }),
  setSolPrice: (price) => set({ solPrice: price }),
}));

// -----------------------------------
// CONSTANTS
// -----------------------------------
const HELIUS_RPC_URL = `https://mainnet.helius-rpc.com/?api-key=${import.meta.env.VITE_HELIUS_API_KEY}`;

// Cache for SOL price to avoid too frequent updates
let lastSolPriceUpdate = 0;
const SOL_PRICE_UPDATE_INTERVAL = 60000; // 1 minute

async function fetchSolPrice() {
  const store = usePumpPortalStore.getState();
  const now = Date.now();

  // Only update price if enough time has passed
  if (now - lastSolPriceUpdate < SOL_PRICE_UPDATE_INTERVAL) {
    return store.solPrice || 100; // Fallback to 100 if no price available
  }

  try {
    const response = await axios.post(HELIUS_RPC_URL, {
      jsonrpc: "2.0",
      id: "sol-price",
      method: "getAssetPrice",
      params: ["So11111111111111111111111111111111111111112"]
    });

    if (response.data?.result?.price) {
      const price = response.data.result.price;
      store.setSolPrice(price);
      lastSolPriceUpdate = now;
      console.log('[PumpPortal] Updated SOL price:', price);
      return price;
    }
  } catch (error) {
    console.error('[PumpPortal] Error fetching SOL price:', error);
  }

  return store.solPrice || 100; // Fallback to existing price or 100
}

async function fetchTokenMetadata(mint: string) {
  try {
    const response = await axios.post(HELIUS_RPC_URL, {
      jsonrpc: "2.0",
      id: "token-metadata",
      method: "getAsset",
      params: [mint]
    });

    if (response.data?.result) {
      return response.data.result;
    }
  } catch (error) {
    console.error('[PumpPortal] Error fetching token metadata:', error);
  }
  return null;
}

async function mapPumpPortalData(data: any): Promise<PumpPortalToken> {
  try {
    console.log('[PumpPortal] Raw data received:', data);

    const solPrice = await fetchSolPrice();
    const metadata = await fetchTokenMetadata(data.mint);

    // Extract basic data
    const vSolInBondingCurve = Number(data.vSolInBondingCurve || 0);
    const initialBuy = Number(data.initialBuy || 0);

    // Calculate metrics in USD
    const liquidityUsd = vSolInBondingCurve * solPrice;
    const volumeUsd = initialBuy * solPrice;

    // Get total supply from metadata or use default
    const totalSupply = metadata?.tokenInfo?.supply?.amount || 1_000_000_000;
    const decimals = metadata?.tokenInfo?.decimals || 9;

    // Calculate price per token in USD
    const pricePerTokenSol = data.price || 0;
    const pricePerTokenUsd = pricePerTokenSol * solPrice;

    // Calculate market cap
    const marketCapUsd = pricePerTokenUsd * (totalSupply / Math.pow(10, decimals));

    const token: PumpPortalToken = {
      symbol: metadata?.symbol || data.symbol || data.mint?.slice(0, 6) || 'Unknown',
      name: metadata?.name || data.name || `Token ${data.mint?.slice(0, 8)}`,
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
          // TODO: Update volume and swaps
          // Will be implemented in next iteration
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
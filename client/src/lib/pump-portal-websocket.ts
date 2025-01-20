import { create } from "zustand";

// -----------------------------------
// TYPES
// -----------------------------------
export interface PumpPortalToken {
  symbol: string;
  name: string;
  address: string;

  // We'll store these numeric fields as strings, e.g. "1234.56"
  liquidity: string;
  l1Liquidity: string;
  marketCap: string;

  liquidityChange: number;
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

interface PumpPortalStore {
  tokens: PumpPortalToken[];
  isConnected: boolean;

  // We'll store the current SOL price here
  solPrice: number | null;
  setSolPrice: (price: number | null) => void;

  addToken: (token: PumpPortalToken) => void;
  updateToken: (address: string, updates: Partial<PumpPortalToken>) => void;
  setConnected: (connected: boolean) => void;
}

// -----------------------------------
// ZUSTAND STORE
// -----------------------------------
export const usePumpPortalStore = create<PumpPortalStore>((set) => ({
  tokens: [],
  isConnected: false,

  // Initially, we don't know the SOL price
  solPrice: null,
  setSolPrice: (price) => set({ solPrice: price }),

  addToken: (token) =>
    set((state) => {
      const exists = state.tokens.some((t) => t.address === token.address);
      if (!exists) {
        // Keep the 10 newest tokens. Remove .slice(...) if you want all
        return {
          tokens: [token, ...state.tokens].slice(0, 10),
        };
      }
      return state;
    }),

  updateToken: (address, updates) =>
    set((state) => ({
      tokens: state.tokens.map((token) =>
        token.address === address ? { ...token, ...updates } : token
      ),
    })),

  setConnected: (connected) => set({ isConnected: connected }),
}));

// -----------------------------------
// 1. FETCH SOL PRICE FROM CRYPTOCOMPARE
// -----------------------------------
async function fetchSolPrice(): Promise<number | null> {
  try {
    // Basic CryptoCompare endpoint: returns { "USD": 25.12 } for example
    const response = await fetch(
      "https://min-api.cryptocompare.com/data/price?fsym=SOL&tsyms=USD"
    );
    const data = await response.json();
    return data?.USD ?? null;
  } catch (error) {
    console.error("[SOL Price] Fetch failed:", error);
    return null;
  }
}

/**
 * Start polling CryptoCompare every 15 seconds for an updated SOL price.
 */
function startSolPricePolling() {
  const store = usePumpPortalStore.getState();

  // Immediately fetch once at startup
  fetchSolPrice().then((price) => {
    store.setSolPrice(price);
    if (price) {
      console.log("[SolPrice] Initial SOL Price:", price);
    }
  });

  // Then poll every 15s
  setInterval(async () => {
    try {
      const price = await fetchSolPrice();
      store.setSolPrice(price);
      if (price !== null) {
        console.log("[SolPrice Poll] Updated SOL price to:", price);
      }
    } catch (err) {
      console.error("[SolPrice Poll] Error:", err);
    }
  }, 15000);
}

// -----------------------------------
// 2. HELPER: CONVERT A RAW VALUE * SOL PRICE => USD STRING
// -----------------------------------
function getValueInUsd(rawValue: any, solPrice: number | null): string {
  // If we haven't fetched the SOL price yet, we can't compute
  if (!solPrice) return "N/A";

  const numeric = parseFloat(rawValue);
  if (Number.isNaN(numeric)) {
    return "N/A";
  }
  // Multiply rawValue by solPrice, format to 2 decimals
  return (numeric * solPrice).toFixed(2);
}

// -----------------------------------
// 3. MAP WEBSOCKET DATA => PumpPortalToken
//    using `initialBuy` as "Liquidity"
// -----------------------------------
async function mapPumpPortalData(data: any): Promise<PumpPortalToken | null> {
  try {
    console.log("[PumpPortal] Raw WS data:", data);

    const store = usePumpPortalStore.getState();
    const solPrice = store.solPrice;

    // For each field, use the last-known solPrice
    // If your backend sends other field names for L1 or marketCap, adjust here
    const token: PumpPortalToken = {
      symbol: data.symbol || "UNKNOWN",
      name: data.name || "Unknown Name",
      address: data.mint || "",

      // Use data.initialBuy to represent "Liquidity"
      liquidity: data.initialBuy
        ? getValueInUsd(data.initialBuy, solPrice)
        : "N/A",

      // If your backend doesn't provide these yet, they stay "N/A"
      l1Liquidity: "N/A",
      marketCap: "N/A",

      liquidityChange: data.liquidityChange || 0,
      volume: data.volume || 0,
      swaps: data.swaps || 0,

      timestamp: Date.now(),
      status: {
        mad: data.status?.mad || false,
        fad: data.status?.fad || false,
        lb: data.status?.lb || false,
        tri: data.status?.tri || false,
      },
    };

    console.log("[PumpPortal] Mapped token =>", token);
    return token;
  } catch (error) {
    console.error("[PumpPortal] Error mapping data:", error, data);
    return null;
  }
}

// -----------------------------------
// 4. INIT/RECONNECT THE WEBSOCKET & POLL SOL PRICE
// -----------------------------------
export function initializePumpPortalWebSocket() {
  if (typeof window === "undefined") {
    return;
  }

  // 4a. Start polling the CryptoCompare API for SOL price
  startSolPricePolling();

  const store = usePumpPortalStore.getState();
  let ws: WebSocket | null = null;
  let reconnectTimeout: NodeJS.Timeout | null = null;
  let reconnectAttempts = 0;
  const MAX_RECONNECT_ATTEMPTS = 3;
  const RECONNECT_DELAY = 5000;

  function connect() {
    // Cleanup old socket if any
    if (ws) {
      try {
        ws.close();
      } catch (err) {
        console.error("[PumpPortal] Error closing old WebSocket:", err);
      }
      ws = null;
    }

    console.log("[PumpPortal] Initializing WebSocket...");
    ws = new WebSocket("wss://pumpportal.fun/api/data");

    ws.onopen = () => {
      console.log("[PumpPortal] Connected!");
      store.setConnected(true);
      reconnectAttempts = 0;

      if (ws?.readyState === WebSocket.OPEN) {
        // Example subscription
        ws.send(JSON.stringify({ method: "subscribeNewToken" }));
        console.log("[PumpPortal] Subscribed to new token events");
      }
    };

    ws.onmessage = async (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("[PumpPortal] Received event:", data);

        // Skip "Successfully subscribed" system message
        if (data.message && data.message.includes("Successfully subscribed")) {
          return;
        }

        if (data.txType === "create") {
          const newToken = await mapPumpPortalData(data);
          if (newToken) {
            store.addToken(newToken);
            console.log("[PumpPortal] Added new token:", newToken.symbol);
          }
        } else if (data.txType === "update" || data.txType === "trade") {
          const updatedToken = await mapPumpPortalData(data);
          if (updatedToken) {
            store.updateToken(updatedToken.address, updatedToken);
            console.log("[PumpPortal] Updated token:", updatedToken.symbol);
          }
        } else {
          console.log("[PumpPortal] Unknown txType:", data.txType);
        }
      } catch (err) {
        console.error("[PumpPortal] Failed to parse WS message:", err);
      }
    };

    ws.onerror = (err) => {
      console.error("[PumpPortal] WebSocket error:", err);
      store.setConnected(false);
    };

    ws.onclose = () => {
      console.warn("[PumpPortal] WebSocket closed");
      store.setConnected(false);

      if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttempts++;
        reconnectTimeout = setTimeout(connect, RECONNECT_DELAY);
      } else {
        console.error("[PumpPortal] Max reconnect attempts reached, not retrying.");
      }
    };
  }

  // Kick off the first connection
  connect();
}

// Auto-initialize in the browser
if (typeof window !== "undefined") {
  initializePumpPortalWebSocket();
}

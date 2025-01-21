import { create } from "zustand";
import axios from "axios";

// -----------------------------------
// TYPES
// -----------------------------------
export interface PumpPortalToken {
  symbol: string;
  name: string;
  address: string;
  marketCap: string; // Market cap in SOL
  price: string; // Token price in SOL
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
const HELIUS_API_KEY = "004f9b13-f526-4952-9998-52f5c7bec6ee"; // Your Helius API Key
const HELIUS_BASE_URL = "https://api.helius.xyz/v0/";
const REFRESH_INTERVAL = 5000; // 5 seconds
const REQUEST_QUEUE: (() => Promise<void>)[] = [];
let IS_PROCESSING_QUEUE = false;

// -----------------------------------
// PROCESS REQUEST QUEUE
// -----------------------------------
async function processQueue() {
  if (IS_PROCESSING_QUEUE) return;
  IS_PROCESSING_QUEUE = true;

  while (REQUEST_QUEUE.length > 0) {
    const request = REQUEST_QUEUE.shift();
    if (request) await request();
    await new Promise((resolve) => setTimeout(resolve, 100)); // Wait 100ms between requests
  }

  IS_PROCESSING_QUEUE = false;
}

// -----------------------------------
// FETCH TOKEN DATA FROM HELIUS
// -----------------------------------
async function fetchTokenData(mint: string) {
  try {
    console.log("[DEBUG] Fetching token data for mint:", mint);
    console.log("[DEBUG] Using API Key:", HELIUS_API_KEY);

    const response = await axios.post(
      `${HELIUS_BASE_URL}token-metadata`,
      { mintAccounts: [mint] },
      {
        headers: {
          Authorization: `Bearer ${HELIUS_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    const metadata = response.data[0];
    console.log("[Helius] Token Metadata:", metadata);

    return {
      symbol: metadata.symbol || "UNKNOWN",
      name: metadata.name || "Unknown Name",
      marketCap: "N/A", // Placeholder for now
      price: "N/A", // Placeholder for now
      address: mint,
      timestamp: Date.now(),
      status: {
        mad: false,
        fad: false,
        lb: false,
        tri: false,
      },
    };
  } catch (error) {
    console.error("[Helius] Error fetching token data:", error.response?.data || error.message);
    return null;
  }
}

// -----------------------------------
// HANDLE NEW TOKEN
// -----------------------------------
async function handleNewToken(data: any) {
  const store = usePumpPortalStore.getState();
  const mint = data.mint;

  // Add fetch task to queue
  REQUEST_QUEUE.push(async () => {
    const tokenData = await fetchTokenData(mint);
    if (tokenData) {
      store.addToken(tokenData);
      console.log("[PumpPortal] Added new token:", tokenData);
    }
  });

  processQueue();
}

// -----------------------------------
// AUTO-REFRESH DATA
// -----------------------------------
function autoRefreshTokens() {
  setInterval(async () => {
    const store = usePumpPortalStore.getState();
    const tokens = store.tokens;

    for (const token of tokens) {
      REQUEST_QUEUE.push(async () => {
        const refreshedData = await fetchTokenData(token.address);
        if (refreshedData) {
          store.addToken(refreshedData);
          console.log("[PumpPortal] Refreshed token:", refreshedData);
        }
      });
    }

    processQueue();
  }, REFRESH_INTERVAL);
}

// -----------------------------------
// WEBSOCKET CONNECTION
// -----------------------------------
function initializePumpPortalWebSocket() {
  const ws = new WebSocket("wss://pumpportal.fun/api/data");
  const store = usePumpPortalStore.getState();

  ws.onopen = () => {
    console.log("[PumpPortal] WebSocket connected.");
    store.setConnected(true);
    ws.send(JSON.stringify({ method: "subscribeNewToken" }));
  };

  ws.onmessage = async (event) => {
    try {
      const data = JSON.parse(event.data);
      console.log("[PumpPortal] Received data:", data);
      if (data.txType === "create") {
        await handleNewToken(data);
      }
    } catch (error) {
      console.error("[PumpPortal] WebSocket message error:", error);
    }
  };

  ws.onerror = (error) => console.error("[PumpPortal] WebSocket error:", error);

  ws.onclose = () => {
    console.warn("[PumpPortal] WebSocket disconnected. Reconnecting in 5 seconds...");
    setTimeout(initializePumpPortalWebSocket, 5000);
  };
}

// -----------------------------------
// INITIALIZE
// -----------------------------------
initializePumpPortalWebSocket();
autoRefreshTokens();

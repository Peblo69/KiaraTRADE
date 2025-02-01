import { create } from "zustand";
import { usePumpPortalStore } from "./pump-portal-websocket";

// Constants
const HELIUS_API_KEY = process.env.NEXT_PUBLIC_HELIUS_API_KEY;
const HELIUS_WS_URL = `wss://rpc.helius.xyz/?api-key=${HELIUS_API_KEY}`;

interface TokenData {
  trades: {
    signature: string;
    timestamp: number;
    type: 'buy' | 'sell';
    tokenAmount: number;
    solAmount: number;
    priceInSol: number;
    priceInUsd: number;
  }[];
  lastPrice?: number;
  volume24h?: number;
}

interface HeliusStore {
  tokenData: Record<string, TokenData>;
  isConnected: boolean;
  subscribedTokens: Set<string>;
  addTrade: (tokenAddress: string, trade: TokenData['trades'][0]) => void;
  setTokenData: (tokenAddress: string, data: Partial<TokenData>) => void;
  setConnected: (connected: boolean) => void;
  subscribeToToken: (tokenAddress: string) => void;
}

export const useHeliusStore = create<HeliusStore>((set, get) => ({
  tokenData: {},
  isConnected: false,
  subscribedTokens: new Set(),

  addTrade: (tokenAddress, trade) => {
    set((state) => {
      const tokenTrades = state.tokenData[tokenAddress]?.trades || [];
      return {
        tokenData: {
          ...state.tokenData,
          [tokenAddress]: {
            ...state.tokenData[tokenAddress],
            trades: [trade, ...tokenTrades].slice(0, 100),
            lastPrice: trade.priceInUsd,
          },
        },
      };
    });
  },

  setTokenData: (tokenAddress, data) => {
    set((state) => ({
      tokenData: {
        ...state.tokenData,
        [tokenAddress]: {
          ...state.tokenData[tokenAddress],
          ...data,
        },
      },
    }));
  },

  setConnected: (connected) => set({ isConnected: connected }),

  subscribeToToken: (tokenAddress) => {
    if (!ws?.readyState === WebSocket.OPEN) {
      console.log('[Helius] WebSocket not ready, queuing subscription');
      return;
    }

    try {
      const store = get();
      if (store.subscribedTokens.has(tokenAddress)) {
        console.log(`[Helius] Already subscribed to token: ${tokenAddress}`);
        return;
      }

      // Subscribe to transactions
      ws?.send(JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'subscribeTransactions',
        params: [
          {
            account: tokenAddress,
            commitment: 'confirmed',
            encoding: 'jsonParsed'
          }
        ]
      }));

      store.subscribedTokens.add(tokenAddress);
      console.log(`[Helius] Subscribed to token: ${tokenAddress}`);
    } catch (error) {
      console.error('[Helius] Subscribe error:', error);
    }
  }
}));

// Helper functions for external use
export function setupTokenSubscription(tokenAddress: string) {
  // Subscribe to both data sources
  usePumpPortalStore.getState().addToViewedTokens(tokenAddress);
  useHeliusStore.getState().subscribeToToken(tokenAddress);
}

export function getCombinedTokenData(tokenAddress: string) {
  const pumpData = usePumpPortalStore.getState().getToken(tokenAddress);
  const heliusData = useHeliusStore.getState().tokenData[tokenAddress];

  return {
    ...pumpData,
    realTimeData: heliusData
  };
}

// WebSocket Connection Management
let ws: WebSocket | null = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY = 5000;

function handleWebSocketMessage(event: MessageEvent) {
  try {
    const data = JSON.parse(event.data);

    if (data.method === 'transactionNotification') {
      const tx = data.params.result;
      const tokenAddress = tx.accountData?.mint;
      if (!tokenAddress) return;

      const solPrice = usePumpPortalStore.getState().solPrice;
      const solAmount = tx.nativeTransfers?.[0]?.amount / 1e9 || 0;

      useHeliusStore.getState().addTrade(tokenAddress, {
        signature: tx.signature,
        timestamp: Date.now(),
        type: tx.tokenTransfers?.[0]?.amount > 0 ? 'buy' : 'sell',
        tokenAmount: Math.abs(tx.tokenTransfers?.[0]?.amount || 0),
        solAmount,
        priceInSol: solAmount,
        priceInUsd: solAmount * (solPrice || 0)
      });
    }
  } catch (error) {
    console.error('[Helius] Message processing error:', error);
  }
}

// Export the initialization function with the name that's being imported
export function initializeHeliusWebSocket() {
  if (typeof window === 'undefined' || !HELIUS_API_KEY) return;

  ws = new WebSocket(HELIUS_WS_URL);

  ws.onopen = () => {
    console.log('[Helius] Connected');
    useHeliusStore.getState().setConnected(true);
    reconnectAttempts = 0;

    // Resubscribe to all tokens
    const store = useHeliusStore.getState();
    store.subscribedTokens.forEach(tokenAddress => {
      store.subscribeToToken(tokenAddress);
    });
  };

  ws.onclose = () => {
    console.log('[Helius] Disconnected');
    useHeliusStore.getState().setConnected(false);

    if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
      const delay = RECONNECT_DELAY * Math.pow(1.5, reconnectAttempts);
      console.log(`[Helius] Attempting reconnect in ${delay}ms...`);

      reconnectAttempts++;
      setTimeout(initializeHeliusWebSocket, delay);
    }
  };

  ws.onerror = (event) => {
    console.error('[Helius] WebSocket error:', event);
  };

  ws.onmessage = handleWebSocketMessage;
}

// Initialize WebSocket connection
if (typeof window !== 'undefined') {
  initializeHeliusWebSocket();
}
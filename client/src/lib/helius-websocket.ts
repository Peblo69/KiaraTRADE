import { create } from 'zustand';
import { Connection, PublicKey } from '@solana/web3.js';

const HELIUS_API_KEY = import.meta.env.VITE_HELIUS_API_KEY;
const HELIUS_WS_URL = `${import.meta.env.VITE_HELIUS_WS_URL}/?api-key=${HELIUS_API_KEY}`;
const HELIUS_REST_URL = import.meta.env.VITE_HELIUS_REST_URL;
const RECONNECT_DELAY = 5000;
const MAX_RECONNECT_ATTEMPTS = 5;

interface HeliusStore {
  isConnected: boolean;
  subscribedTokens: Set<string>;
  solPrice: number;
  setConnected: (connected: boolean) => void;
  subscribeToToken: (tokenAddress: string) => void;
  setSolPrice: (price: number) => void;
}

let ws: WebSocket | null = null;
let reconnectTimeout: NodeJS.Timeout | null = null;
let reconnectAttempts = 0;

export const useHeliusStore = create<HeliusStore>((set, get) => ({
  isConnected: false,
  subscribedTokens: new Set(),
  solPrice: 0,
  setConnected: (connected) => set({ isConnected: connected }),
  setSolPrice: (price) => set({ solPrice: price }),
  subscribeToToken: (tokenAddress) => {
    if (!HELIUS_API_KEY) return;

    try {
      new PublicKey(tokenAddress);
    } catch {
      return;
    }

    if (!ws || ws.readyState !== WebSocket.OPEN) {
      const store = get();
      store.subscribedTokens.add(tokenAddress);
      set({ subscribedTokens: new Set(store.subscribedTokens) });

      if (!ws) {
        initializeHeliusWebSocket();
      }
      return;
    }

    const subscribeMessage = {
      jsonrpc: '2.0',
      id: `token-sub-${tokenAddress}`,
      method: 'accountSubscribe',
      params: [
        tokenAddress,
        {
          encoding: 'jsonParsed',
          commitment: 'confirmed'
        }
      ]
    };

    try {
      ws.send(JSON.stringify(subscribeMessage));
    } catch {}
  }
}));

async function updateSolPrice(): Promise<void> {
  try {
    const response = await fetch('/api/sol-price');
    if (!response.ok) throw new Error();

    const data = await response.json();
    useHeliusStore.getState().setSolPrice(data.price);
  } catch {}
}

function startHeartbeat() {
  const heartbeatInterval = setInterval(() => {
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ jsonrpc: '2.0', id: 'heartbeat', method: 'ping' }));
    } else {
      clearInterval(heartbeatInterval);
    }
  }, 30000);

  return heartbeatInterval;
}

export function initializeHeliusWebSocket() {
  if (typeof window === 'undefined' || !HELIUS_API_KEY) return;

  try {
    if (ws) {
      ws.close();
      ws = null;
    }

    ws = new WebSocket(HELIUS_WS_URL);
    const heartbeatInterval = startHeartbeat();

    ws.onopen = () => {
      useHeliusStore.getState().setConnected(true);
      reconnectAttempts = 0;

      updateSolPrice();
      const priceInterval = setInterval(updateSolPrice, 10000);

      const store = useHeliusStore.getState();
      if (store.subscribedTokens.size > 0) {
        store.subscribedTokens.forEach(tokenAddress => {
          store.subscribeToToken(tokenAddress);
        });
      }

      ws!.addEventListener('close', () => {
        clearInterval(priceInterval);
        clearInterval(heartbeatInterval);
      });
    };

    ws.onmessage = async (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.result !== undefined && data.id?.startsWith('token-sub-')) {
          return;
        }

        if (data.method === 'accountNotification') {
          const value = data.params?.result?.value;
          if (!value) return;

          if (value.data?.program === 'spl-token') {
            const tokenData = value.data.parsed?.info;
            if (tokenData) {
              // Token data is available for use by other components
            }
          }
        }
      } catch {}
    };

    ws.onclose = () => {
      useHeliusStore.getState().setConnected(false);

      if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttempts++;
        if (reconnectTimeout) {
          clearTimeout(reconnectTimeout);
        }
        reconnectTimeout = setTimeout(initializeHeliusWebSocket, RECONNECT_DELAY);
      }
    };

    ws.onerror = () => {
      useHeliusStore.getState().setConnected(false);
    };

  } catch {
    if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
      reconnectAttempts++;
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
      reconnectTimeout = setTimeout(initializeHeliusWebSocket, RECONNECT_DELAY);
    }
  }
}

initializeHeliusWebSocket();
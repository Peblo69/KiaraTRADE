import { create } from 'zustand';
import { Connection, PublicKey } from '@solana/web3.js';
import { useChartStore } from '@/lib/chart-websocket';

// Constants
const HELIUS_API_KEY = import.meta.env.VITE_HELIUS_API_KEY;
const HELIUS_WS_URL = `${import.meta.env.VITE_HELIUS_WS_URL}/?api-key=${HELIUS_API_KEY}`;
const HELIUS_REST_URL = import.meta.env.VITE_HELIUS_REST_URL;
const RECONNECT_DELAY = 5000;
const MAX_RECONNECT_ATTEMPTS = 5;
const SPL_TOKEN_PROGRAM_ID = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';

// TypeScript Interfaces
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
    if (!HELIUS_API_KEY) {
      console.error('[Helius] API key not found in environment variables');
      return;
    }

    if (!ws || ws.readyState !== WebSocket.OPEN) {
      console.error('[Helius] WebSocket not connected');
      // Initialize WebSocket if not already connected
      initializeHeliusWebSocket();
      return;
    }

    const { subscribedTokens } = get();
    if (subscribedTokens.has(tokenAddress)) {
      console.log('[Helius] Already subscribed to token:', tokenAddress);
      return;
    }

    console.log('[Helius] Subscribing to token:', tokenAddress);

    try {
      const subscribeMessage = {
        jsonrpc: '2.0',
        id: `token-sub-${tokenAddress}`,
        method: 'programSubscribe',
        params: [
          SPL_TOKEN_PROGRAM_ID,
          {
            encoding: 'jsonParsed',
            filters: [
              {
                dataSize: 165,
                memcmp: {
                  offset: 0,
                  bytes: tokenAddress
                }
              }
            ],
            commitment: 'finalized'
          }
        ]
      };

      console.log('[Helius] Sending subscription message:', subscribeMessage);
      ws.send(JSON.stringify(subscribeMessage));

      subscribedTokens.add(tokenAddress);
      set({ subscribedTokens: new Set(subscribedTokens) });
    } catch (error) {
      console.error('[Helius] Failed to subscribe to token:', error);
    }
  }
}));

async function updateSolPrice() {
  try {
    const response = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=SOLUSDT');
    const data = await response.json();
    useHeliusStore.getState().setSolPrice(parseFloat(data.price));
    console.log('[Helius] Updated SOL price:', data.price);
  } catch (error) {
    console.error('[Helius] Error updating SOL price:', error);
  }
}

export function initializeHeliusWebSocket() {
  if (typeof window === 'undefined') {
    console.error('[Helius] Not in browser environment');
    return;
  }

  if (!HELIUS_API_KEY) {
    console.error('[Helius] API key not found in environment variables');
    return;
  }

  try {
    if (ws) {
      console.log('[Helius] Closing existing WebSocket connection');
      ws.close();
      ws = null;
    }

    console.log('[Helius] Initializing WebSocket...');
    ws = new WebSocket(HELIUS_WS_URL);

    ws.onopen = () => {
      console.log('[Helius] Connected');
      useHeliusStore.getState().setConnected(true);
      reconnectAttempts = 0;

      // Start SOL price updates
      updateSolPrice();
      const priceInterval = setInterval(updateSolPrice, 10000);

      // Resubscribe to tokens
      const store = useHeliusStore.getState();
      if (store.subscribedTokens.size > 0) {
        console.log('[Helius] Resubscribing to tokens:', Array.from(store.subscribedTokens));
        store.subscribedTokens.forEach(tokenAddress => {
          store.subscribeToToken(tokenAddress);
        });
      }

      // Cleanup interval on close
      ws!.addEventListener('close', () => clearInterval(priceInterval));
    };

    ws.onmessage = async (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('[Helius] Received message:', data);

        if (data.method === 'programNotification') {
          if (!data.params?.result?.value?.account) {
            console.warn('[Helius] Invalid program notification:', data);
            return;
          }

          const account = data.params.result.value.account;
          if (account.data.program === 'spl-token') {
            const tokenData = account.data.parsed.info;
            console.log('[Helius] Token account update:', tokenData);

            if (tokenData.tokenAmount) {
              const solPrice = useHeliusStore.getState().solPrice;
              useChartStore.getState().addTrade(tokenData.mint, {
                timestamp: Date.now(),
                priceInUsd: (tokenData.tokenAmount.uiAmount || 0) * solPrice,
                amount: tokenData.tokenAmount.uiAmount || 0
              });
            }
          }
        } else if (data.result !== undefined) {
          // Log subscription confirmations
          console.log('[Helius] Subscription confirmed:', data);
        }
      } catch (error) {
        console.error('[Helius] Message handling error:', error);
      }
    };

    ws.onclose = () => {
      console.log('[Helius] Disconnected');
      useHeliusStore.getState().setConnected(false);

      if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttempts++;
        console.log(`[Helius] Attempting reconnect ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}`);
        if (reconnectTimeout) {
          clearTimeout(reconnectTimeout);
        }
        reconnectTimeout = setTimeout(initializeHeliusWebSocket, RECONNECT_DELAY);
      }
    };

    ws.onerror = (error) => {
      console.error('[Helius] WebSocket error:', error);
    };

  } catch (error) {
    console.error('[Helius] Initialization error:', error);
    if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
      reconnectAttempts++;
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
      reconnectTimeout = setTimeout(initializeHeliusWebSocket, RECONNECT_DELAY);
    }
  }
}

// Initialize WebSocket connection
initializeHeliusWebSocket();
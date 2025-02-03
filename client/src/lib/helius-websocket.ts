import { create } from "zustand";
import { Connection, PublicKey } from '@solana/web3.js';
import { useChartStore } from '@/lib/chart-websocket';

// Constants
const HELIUS_API_KEY = import.meta.env.VITE_HELIUS_API_KEY;
const HELIUS_WS_URL = `${import.meta.env.VITE_HELIUS_WS_URL}/?api-key=${HELIUS_API_KEY}`;
const HELIUS_REST_URL = import.meta.env.VITE_HELIUS_REST_URL;
const RECONNECT_DELAY = 5000;
const MAX_RECONNECT_ATTEMPTS = 5;

// TypeScript Interfaces
interface HeliusStore {
  isConnected: boolean;
  subscribedTokens: Set<string>;
  solPrice: number;
  setConnected: (connected: boolean) => void;
  subscribeToToken: (tokenAddress: string) => void;
  setSolPrice: (price: number) => void;
}

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

    const { subscribedTokens } = get();
    if (!ws || ws.readyState !== WebSocket.OPEN || subscribedTokens.has(tokenAddress)) {
      return;
    }

    console.log('[Helius] Subscribing to token:', tokenAddress);

    try {
      // Subscribe to token account changes using v2 API method
      ws.send(JSON.stringify({
        jsonrpc: '2.0',
        id: `token-sub-${tokenAddress}`,
        method: 'programSubscribe',
        params: [
          'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA', // SPL Token program ID
          {
            encoding: 'jsonParsed',
            filters: [
              {
                dataSize: 165, // Token account data size
                memcmp: {
                  offset: 0,
                  bytes: tokenAddress // Filter for specific token mint
                }
              }
            ],
            commitment: 'processed',
            showEvents: true,
            maxSupportedTransactionVersion: 0
          }
        ]
      }));

      subscribedTokens.add(tokenAddress);
      console.log('[Helius] Subscribed to token:', tokenAddress);
    } catch (error) {
      console.error('[Helius] Failed to subscribe to token:', error);
    }
  }
}));

let ws: WebSocket | null = null;
let reconnectTimeout: NodeJS.Timeout | null = null;
let reconnectAttempts = 0;

async function handleTokenTransaction(data: any) {
  try {
    if (!data?.signature) return;

    const store = useHeliusStore.getState();
    const solPrice = store.solPrice;

    if (!solPrice) {
      console.warn('[Helius] No SOL price available');
      return;
    }

    console.log('[Helius] Processing transaction:', {
      signature: data.signature
    });

    if (!HELIUS_REST_URL) {
      console.error('[Helius] REST URL not configured');
      return;
    }

    const connection = new Connection(HELIUS_REST_URL);

    // Use v2 API methods
    const statuses = await connection.getSignatureStatuses([data.signature]);
    if (!statuses.value[0] || !statuses.value[0].confirmationStatus) {
      console.warn('[Helius] Transaction not confirmed:', data.signature);
      return;
    }

    const tx = await connection.getTransaction(data.signature, {
      maxSupportedTransactionVersion: 0,
      commitment: 'processed'
    });

    if (!tx?.meta) {
      console.warn('[Helius] No transaction metadata found');
      return;
    }

    const preBalances = tx.meta.preBalances;
    const postBalances = tx.meta.postBalances;
    const preTokenBalances = tx.meta.preTokenBalances || [];
    const postTokenBalances = tx.meta.postTokenBalances || [];

    // Calculate SOL amount change
    const solChange = postBalances.map((post, i) => post - preBalances[i])
      .reduce((a, b) => Math.abs(a) + Math.abs(b), 0) / 1e9;

    // Process token balance changes
    for (const tokenBalance of [...preTokenBalances, ...postTokenBalances]) {
      if (!tokenBalance?.mint) continue;

      const tokenMint = tokenBalance.mint;
      const preAmount = preTokenBalances.find(b => b?.accountIndex === tokenBalance.accountIndex)?.uiTokenAmount.uiAmount || 0;
      const postAmount = postTokenBalances.find(b => b?.accountIndex === tokenBalance.accountIndex)?.uiTokenAmount.uiAmount || 0;
      const tokenAmount = Math.abs(postAmount - preAmount);

      if (tokenAmount === 0) continue;

      // Calculate price in USD
      const priceInSol = solChange / tokenAmount;
      const priceInUsd = priceInSol * solPrice;

      if (priceInUsd <= 0) {
        console.warn('[Helius] Invalid price calculation:', {
          solChange,
          tokenAmount,
          priceInSol,
          solPrice
        });
        continue;
      }

      // Add trade to chart store
      useChartStore.getState().addTrade(tokenMint, {
        timestamp: (tx.blockTime || Date.now() / 1000) * 1000,
        priceInUsd,
        amount: tokenAmount
      });

      console.log('[Helius] Trade processed:', {
        token: tokenMint,
        priceInSol,
        priceInUsd,
        amount: tokenAmount,
        signature: data.signature
      });
    }
  } catch (error) {
    console.error('[Helius] Error processing transaction:', error);
  }
}

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

  // Start SOL price updates
  updateSolPrice();
  const priceInterval = setInterval(updateSolPrice, 10000);

  try {
    if (ws) {
      ws.close();
      ws = null;
    }

    console.log('[Helius] Initializing WebSocket...');
    ws = new WebSocket(HELIUS_WS_URL);

    ws.onopen = () => {
      console.log('[Helius] Connected');
      useHeliusStore.getState().setConnected(true);
      reconnectAttempts = 0;

      // Resubscribe to tokens
      const store = useHeliusStore.getState();
      store.subscribedTokens.forEach(tokenAddress => {
        store.subscribeToToken(tokenAddress);
      });
    };

    ws.onmessage = async (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('[Helius] Received message:', data);

        if (data.method === 'accountNotification') {
          await handleTokenTransaction(data.params.result);
        } else if (data.result !== undefined) {
          // Log subscription confirmations
          console.log('[Helius] Subscription confirmed:', data);
        } else {
          console.log('[Helius] Unhandled message type:', data);
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

    return () => {
      clearInterval(priceInterval);
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
      if (ws) {
        ws.close();
        ws = null;
      }
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
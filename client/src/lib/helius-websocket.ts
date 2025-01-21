import { create } from 'zustand';
import { Connection, PublicKey } from '@solana/web3.js';

interface TokenTrade {
  signature: string;
  timestamp: number;
  tokenAddress: string;
  amount: number;
  price: number;
  priceUsd: number;
  buyer: string;
  seller: string;
  type: 'buy' | 'sell';
}

interface HeliusStore {
  trades: Record<string, TokenTrade[]>;
  isConnected: boolean;
  addTrade: (tokenAddress: string, trade: TokenTrade) => void;
  setConnected: (connected: boolean) => void;
}

export const useHeliusStore = create<HeliusStore>((set) => ({
  trades: {},
  isConnected: false,
  addTrade: (tokenAddress, trade) =>
    set((state) => ({
      trades: {
        ...state.trades,
        [tokenAddress]: [trade, ...(state.trades[tokenAddress] || [])].slice(0, 100),
      },
    })),
  setConnected: (connected) => set({ isConnected: connected }),
}));

let ws: WebSocket | null = null;
const HELIUS_API_KEY = process.env.HELIUS_API_KEY;
const connection = new Connection(`https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`);

function handleTradeEvent(event: any) {
  // Parse and handle trade events
  // This will use getTransaction instead of getConfirmedTransaction
  // and getSignatureStatuses for confirmation
  try {
    const data = JSON.parse(event.data);
    console.log('[Helius] Raw trade data:', data);

    // Verify transaction using getSignatureStatuses
    connection.getSignatureStatuses([data.signature], { searchTransactionHistory: true })
      .then(async (result) => {
        if (!result.value[0]?.confirmationStatus) return;

        // Get full transaction details using getTransaction (v2 endpoint)
        const tx = await connection.getTransaction(data.signature, {
          maxSupportedTransactionVersion: 0,
        });

        if (!tx) return;

        // Process trade data...
        const trade: TokenTrade = {
          signature: data.signature,
          timestamp: tx.blockTime ? tx.blockTime * 1000 : Date.now(),
          tokenAddress: data.tokenAddress,
          amount: data.amount,
          price: data.price,
          priceUsd: data.priceUsd,
          buyer: data.buyer,
          seller: data.seller,
          type: data.type,
        };

        useHeliusStore.getState().addTrade(data.tokenAddress, trade);
      })
      .catch(console.error);
  } catch (error) {
    console.error('[Helius] Error processing trade event:', error);
  }
}

let reconnectTimeout: NodeJS.Timeout | null = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY = 5000;

export function initializeHeliusWebSocket() {
  if (typeof window === 'undefined' || !HELIUS_API_KEY) return;

  if (ws) {
    try {
      ws.close();
    } catch (e) {
      console.error('[Helius] Error closing WebSocket:', e);
    }
    ws = null;
  }

  try {
    console.log('[Helius] Initializing WebSocket...');
    ws = new WebSocket(`wss://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`);

    ws.onopen = () => {
      console.log('[Helius] WebSocket connected');
      useHeliusStore.getState().setConnected(true);
      reconnectAttempts = 0;

      // Subscribe to token trade events
      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'tokenTradeSubscribe',
        }));
        console.log('[Helius] Subscribed to token trades');
      }
    };

    ws.onmessage = handleTradeEvent;

    ws.onclose = () => {
      console.log('[Helius] WebSocket disconnected');
      useHeliusStore.getState().setConnected(false);

      if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttempts++;
        console.log(`[Helius] Attempting reconnect ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}`);
        reconnectTimeout = setTimeout(initializeHeliusWebSocket, RECONNECT_DELAY);
      }
    };

    ws.onerror = (error) => {
      console.error('[Helius] WebSocket error:', error);
      useHeliusStore.getState().setConnected(false);
    };

  } catch (error) {
    console.error('[Helius] Failed to initialize WebSocket:', error);
    useHeliusStore.getState().setConnected(false);

    if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
      reconnectAttempts++;
      console.log(`[Helius] Attempting reconnect ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}`);
      reconnectTimeout = setTimeout(initializeHeliusWebSocket, RECONNECT_DELAY);
    }
  }
}

// Initialize WebSocket connection
initializeHeliusWebSocket();
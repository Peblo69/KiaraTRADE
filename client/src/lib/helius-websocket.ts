import { create } from 'zustand';
import { Connection } from '@solana/web3.js';

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
  subscribedTokens: Set<string>;
  addTrade: (tokenAddress: string, trade: TokenTrade) => void;
  setConnected: (connected: boolean) => void;
  subscribeToToken: (tokenAddress: string) => void;
}

export const useHeliusStore = create<HeliusStore>((set, get) => ({
  trades: {},
  isConnected: false,
  subscribedTokens: new Set(),
  addTrade: (tokenAddress, trade) =>
    set((state) => ({
      trades: {
        ...state.trades,
        [tokenAddress]: [trade, ...(state.trades[tokenAddress] || [])].slice(0, 100),
      },
    })),
  setConnected: (connected) => set({ isConnected: connected }),
  subscribeToToken: (tokenAddress) => {
    const { subscribedTokens } = get();
    if (subscribedTokens.has(tokenAddress)) return;

    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'accountSubscribe',
        params: [
          tokenAddress,
          {
            commitment: 'confirmed',
            encoding: 'jsonParsed',
            transactionDetails: 'full',
            showEvents: true
          }
        ]
      }));

      subscribedTokens.add(tokenAddress);
      set({ subscribedTokens });
      console.log('[Helius] Subscribed to token:', tokenAddress);
    }
  }
}));

let ws: WebSocket | null = null;
const HELIUS_API_KEY = import.meta.env.VITE_HELIUS_API_KEY || '';
const connection = new Connection(`https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`);

async function handleAccountUpdate(data: any) {
  try {
    if (!data.signature) return;

    // Use getSignatureStatuses (v2 compatible) to verify transaction
    const statuses = await connection.getSignatureStatuses([data.signature]);
    if (!statuses.value[0]?.confirmationStatus) return;

    // Get full transaction details using getTransaction (v2 endpoint)
    const tx = await connection.getTransaction(data.signature, {
      maxSupportedTransactionVersion: 0
    });

    if (!tx || !tx.meta) return;

    // Parse transaction to determine if it's a buy/sell
    const preBalances = tx.meta.preBalances;
    const postBalances = tx.meta.postBalances;

    // Determine transaction type based on token balance changes
    const balanceChanges = postBalances.map((post, i) => post - preBalances[i]);
    const isBuy = balanceChanges[0] < 0; // Simplified logic, can be enhanced

    // Get account keys using getAccountKeys() method (v2 compatible)
    const accountKeys = tx.transaction.message.getAccountKeys();
    if (!accountKeys) return;

    const trade: TokenTrade = {
      signature: data.signature,
      timestamp: tx.blockTime ? tx.blockTime * 1000 : Date.now(),
      tokenAddress: data.accountId,
      amount: Math.abs(balanceChanges[0]) / 1e9, // Convert lamports to SOL
      price: tx.meta.preTokenBalances?.[0]?.uiTokenAmount?.uiAmount || 0,
      priceUsd: 0, // Will be calculated using current SOL price
      buyer: accountKeys.get(isBuy ? 1 : 0)?.toString() || '',
      seller: accountKeys.get(isBuy ? 0 : 1)?.toString() || '',
      type: isBuy ? 'buy' : 'sell'
    };

    useHeliusStore.getState().addTrade(data.accountId, trade);
    console.log('[Helius] Processed trade:', trade);

  } catch (error) {
    console.error('[Helius] Error processing account update:', error);
  }
}

function handleWebSocketMessage(event: MessageEvent) {
  try {
    const data = JSON.parse(event.data);
    console.log('[Helius] Received message:', data);

    if (data.method === 'accountNotification') {
      handleAccountUpdate(data.params.result);
    }
  } catch (error) {
    console.error('[Helius] Error handling WebSocket message:', error);
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

      // Resubscribe to all previously subscribed tokens
      const { subscribedTokens } = useHeliusStore.getState();
      subscribedTokens.forEach(tokenAddress => {
        useHeliusStore.getState().subscribeToToken(tokenAddress);
      });
    };

    ws.onmessage = handleWebSocketMessage;

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
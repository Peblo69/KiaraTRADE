import { create } from 'zustand';
import { Connection, PublicKey } from '@solana/web3.js';
import { useUnifiedTokenStore } from './unified-token-store';
import axios from 'axios';

// Constants
const HELIUS_API_KEY = '004f9b13-f526-4952-9998-52f5c7bec6ee';
const HELIUS_WS_URL = `wss://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;
const RECONNECT_DELAY = 3000;
const MAX_RECONNECT_ATTEMPTS = 10;
const HEARTBEAT_INTERVAL = 15000;
const CONNECTION_TIMEOUT = 10000;
const SUBSCRIPTION_BATCH_SIZE = 50;
const DEBUG = false;

// TypeScript Interfaces
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
  pendingSubscriptions: Set<string>;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  addTrade: (tokenAddress: string, trade: TokenTrade) => void;
  setConnected: (connected: boolean) => void;
  setConnectionStatus: (status: 'connecting' | 'connected' | 'disconnected' | 'error') => void;
  subscribeToToken: (tokenAddress: string) => void;
  clearPendingSubscriptions: () => void;
}

export const useHeliusStore = create<HeliusStore>((set, get) => ({
  trades: {},
  isConnected: false,
  subscribedTokens: new Set(),
  pendingSubscriptions: new Set(),
  connectionStatus: 'disconnected',
  addTrade: (tokenAddress, trade) => {
    set((state) => ({
      trades: {
        ...state.trades,
        [tokenAddress]: [trade, ...(state.trades[tokenAddress] || [])].slice(0, 1000),
      },
    }));

    const unifiedStore = useUnifiedTokenStore.getState();
    const solPrice = unifiedStore.tokens.find(t => t.address === tokenAddress)?.price || 0;

    if (!solPrice) {
      DEBUG && console.warn('[Helius] No SOL price available for trade calculation');
      return;
    }

    const tradeVolumeUsd = trade.amount * solPrice;

    unifiedStore.addTransaction(tokenAddress, {
      signature: trade.signature,
      buyer: trade.buyer,
      solAmount: trade.amount,
      tokenAmount: trade.price,
      timestamp: trade.timestamp,
      type: trade.type,
    });
  },
  setConnected: (connected) => set({ isConnected: connected }),
  setConnectionStatus: (status) => set({ connectionStatus: status }),
  subscribeToToken: (tokenAddress) => {
    const state = get();
    if (state.subscribedTokens.has(tokenAddress)) return;

    state.pendingSubscriptions.add(tokenAddress);
    set({ pendingSubscriptions: new Set(state.pendingSubscriptions) });

    if (ws?.readyState === WebSocket.OPEN) {
      processPendingSubscriptions();
    }
  },
  clearPendingSubscriptions: () => set({ pendingSubscriptions: new Set() })
}));

let ws: WebSocket | null = null;
let reconnectTimeout: NodeJS.Timeout | null = null;
let reconnectAttempts = 0;
let heartbeatInterval: NodeJS.Timeout | null = null;
let connectionTimeout: NodeJS.Timeout | null = null;

const processPendingSubscriptions = () => {
  const store = useHeliusStore.getState();
  const pendingArray = Array.from(store.pendingSubscriptions);

  for (let i = 0; i < pendingArray.length; i += SUBSCRIPTION_BATCH_SIZE) {
    const batch = pendingArray.slice(i, i + SUBSCRIPTION_BATCH_SIZE);

    batch.forEach(tokenAddress => {
      if (ws?.readyState === WebSocket.OPEN) {
        try {
          ws.send(JSON.stringify({
            jsonrpc: '2.0',
            id: `token-sub-${tokenAddress}`,
            method: 'accountSubscribe',
            params: [
              tokenAddress,
              {
                commitment: 'confirmed',
                encoding: 'jsonParsed',
                transactionDetails: 'full',
                showEvents: true,
                maxSupportedTransactionVersion: 0
              }
            ]
          }));

          store.subscribedTokens.add(tokenAddress);
          store.pendingSubscriptions.delete(tokenAddress);
          DEBUG && console.log('[Helius] Subscribed to token:', tokenAddress);
        } catch (error) {
          console.error('[Helius] Failed to subscribe to token:', tokenAddress, error);
        }
      }
    });
  }

  useHeliusStore.setState({
    subscribedTokens: new Set(store.subscribedTokens),
    pendingSubscriptions: new Set(store.pendingSubscriptions)
  });
};

const cleanup = () => {
  if (ws) {
    try {
      ws.close();
    } catch (e) {
      console.error('[Helius] Error closing WebSocket:', e);
    }
    ws = null;
  }

  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
    reconnectTimeout = null;
  }

  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }

  if (connectionTimeout) {
    clearTimeout(connectionTimeout);
    connectionTimeout = null;
  }
};

const startHeartbeat = () => {
  if (heartbeatInterval) return;

  heartbeatInterval = setInterval(() => {
    if (ws?.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify({ jsonrpc: '2.0', method: 'ping' }));
      } catch (error) {
        console.error('[Helius] Failed to send heartbeat:', error);
        ws.close();
      }
    }
  }, HEARTBEAT_INTERVAL);
};

export function initializeHeliusWebSocket() {
  if (typeof window === 'undefined' || !HELIUS_API_KEY) return;

  cleanup();
  const store = useHeliusStore.getState();
  store.setConnectionStatus('connecting');

  try {
    DEBUG && console.log('[Helius] Initializing WebSocket...');
    ws = new WebSocket(HELIUS_WS_URL);

    connectionTimeout = setTimeout(() => {
      if (ws?.readyState !== WebSocket.OPEN) {
        console.error('[Helius] Connection timeout');
        ws?.close();
      }
    }, CONNECTION_TIMEOUT);

    ws.onopen = () => {
      if (connectionTimeout) {
        clearTimeout(connectionTimeout);
        connectionTimeout = null;
      }

      DEBUG && console.log('[Helius] WebSocket connected');
      store.setConnected(true);
      store.setConnectionStatus('connected');
      reconnectAttempts = 0;
      startHeartbeat();
      processPendingSubscriptions();
    };

    ws.onmessage = handleWebSocketMessage;

    ws.onclose = (event) => {
      DEBUG && console.log('[Helius] WebSocket disconnected', event.code, event.reason);
      store.setConnected(false);
      store.setConnectionStatus('disconnected');
      cleanup();

      if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttempts++;
        const delay = Math.min(RECONNECT_DELAY * Math.pow(1.5, reconnectAttempts - 1), 30000);
        DEBUG && console.log(`[Helius] Attempting reconnect ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS} in ${delay}ms`);
        reconnectTimeout = setTimeout(initializeHeliusWebSocket, delay);
      } else {
        store.setConnectionStatus('error');
        console.error('[Helius] Max reconnect attempts reached');
        useUnifiedTokenStore.getState().setError('Unable to maintain Helius WebSocket connection');
      }
    };

    ws.onerror = (error) => {
      console.error('[Helius] WebSocket error:', error.type || 'Unknown error');
      store.setConnectionStatus('error');
      ws?.close();

      if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttempts++;
        const delay = Math.min(RECONNECT_DELAY * Math.pow(1.5, reconnectAttempts - 1), 30000);
        console.log(`[Helius] Scheduling reconnect attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS} in ${delay}ms`);
        reconnectTimeout = setTimeout(initializeHeliusWebSocket, delay);
      } else {
        console.error('[Helius] Max reconnect attempts reached');
      }
    };

  } catch (error) {
    console.error('[Helius] Failed to initialize WebSocket:', error);
    store.setConnectionStatus('error');
    cleanup();

    if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
      reconnectAttempts++;
      const delay = Math.min(RECONNECT_DELAY * Math.pow(1.5, reconnectAttempts - 1), 30000);
      reconnectTimeout = setTimeout(initializeHeliusWebSocket, delay);
    }
  }
}

async function handleWebSocketMessage(event: MessageEvent) {
  try {
    const data = JSON.parse(event.data);

    if (data.method === 'accountNotification') {
      await handleAccountUpdate(data.params.result);
    }
  } catch (error) {
    console.error('[Helius] Error handling WebSocket message:', error);
  }
}

async function handleAccountUpdate(data: any) {
  if (!data?.signature) return;

  try {
    const connection = new Connection(`https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`, {
      commitment: 'confirmed',
    });

    const [status] = await connection.getSignatureStatuses([data.signature]);
    if (!status?.confirmationStatus) return;

    const tx = await connection.getTransaction(data.signature, {
      maxSupportedTransactionVersion: 0
    });

    if (!tx?.meta) return;

    const { meta, transaction } = tx;
    const accountKeys = transaction.message.accountKeys;
    const preTokenBalances = meta.preTokenBalances || [];
    const postTokenBalances = meta.postTokenBalances || [];

    const isTokenTx = accountKeys.some(
      key => key.equals(new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'))
    );

    if (!isTokenTx) return;

    const relevantTokenAccounts = [...preTokenBalances, ...postTokenBalances];
    for (const tokenAccount of relevantTokenAccounts) {
      if (!tokenAccount) continue;

      const preAmount = preTokenBalances.find(
        balance => balance.accountIndex === tokenAccount.accountIndex
      )?.uiTokenAmount.uiAmount || 0;

      const postAmount = postTokenBalances.find(
        balance => balance.accountIndex === tokenAccount.accountIndex
      )?.uiTokenAmount.uiAmount || 0;

      const tokenAmount = Math.abs(postAmount - preAmount);
      if (tokenAmount === 0) continue;

      const isBuy = postAmount > preAmount;
      const solAmount = Math.abs(meta.preBalances[0] - meta.postBalances[0]) / 1e9;

      const trade: TokenTrade = {
        signature: data.signature,
        timestamp: tx.blockTime ? tx.blockTime * 1000 : Date.now(),
        tokenAddress: data.accountId,
        amount: solAmount,
        price: tokenAmount,
        priceUsd: 0,
        buyer: isBuy ? accountKeys[1]?.toString() || '' : '',
        seller: !isBuy ? accountKeys[0]?.toString() || '' : '',
        type: isBuy ? 'buy' : 'sell'
      };

      DEBUG && console.log('[Helius] New trade:', {
        signature: trade.signature,
        type: trade.type,
        amount: trade.amount,
        price: trade.price
      });

      useHeliusStore.getState().addTrade(data.accountId, trade);
    }
  } catch (error) {
    console.error('[Helius] Error processing account update:', error);
  }
}

// Initialize WebSocket connection
initializeHeliusWebSocket();

// Cleanup on window unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', cleanup);
}
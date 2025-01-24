import { create } from 'zustand';
import { Connection, PublicKey } from '@solana/web3.js';
import { useUnifiedTokenStore } from './unified-token-store';
import WebSocket from 'isomorphic-ws';

// Constants
const HELIUS_API_KEY = '004f9b13-f526-4952-9998-52f5c7bec6ee';
const MAX_RETRIES = 5;
const RETRY_DELAY = 5000;
const HELIUS_WS_URL = `wss://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;
const RECONNECT_DELAY = 5000;
const MAX_RECONNECT_ATTEMPTS = 5;

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
  addTrade: (tokenAddress, trade) => {
    set((state) => ({
      trades: {
        ...state.trades,
        [tokenAddress]: [trade, ...(state.trades[tokenAddress] || [])].slice(0, 100),
      },
    }));
  },
  setConnected: (connected) => set({ isConnected: connected }),
  subscribeToToken: (tokenAddress) => {
    if (ws?.readyState === WebSocket.OPEN) {
      subscribeToTokenUpdates(tokenAddress);
    }
  }
}));

let ws: WebSocket | null = null;
let reconnectAttempts = 0;

function subscribeToTokenUpdates(tokenAddress: string) {
  if (!ws || ws.readyState !== WebSocket.OPEN) return;

  try {
    ws.send(JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'accountSubscribe',
      params: [
        tokenAddress,
        { commitment: 'processed' }
      ]
    }));
  } catch (error) {
    console.error('[Helius] Subscribe error:', error);
  }
}

async function processTransaction(signature: string, tokenAddress: string) {
  try {
    const connection = new Connection(`https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`);
    const tx = await connection.getTransaction(signature, { maxSupportedTransactionVersion: 0 });

    if (!tx?.meta) return;

    const preBalances = tx.meta.preTokenBalances || [];
    const postBalances = tx.meta.postTokenBalances || [];

    if (preBalances.length === 0 || postBalances.length === 0) return;

    const preAmount = preBalances[0]?.uiTokenAmount.uiAmount || 0;
    const postAmount = postBalances[0]?.uiTokenAmount.uiAmount || 0;

    if (preAmount === postAmount) return;

    const isBuy = postAmount > preAmount;
    const store = useHeliusStore.getState();

    store.addTrade(tokenAddress, {
      signature,
      timestamp: tx.blockTime ? tx.blockTime * 1000 : Date.now(),
      tokenAddress,
      amount: Math.abs(postAmount - preAmount),
      price: 0,
      priceUsd: 0,
      buyer: isBuy ? tx.transaction.message.accountKeys[0].toString() : '',
      seller: !isBuy ? tx.transaction.message.accountKeys[0].toString() : '',
      type: isBuy ? 'buy' : 'sell'
    });
  } catch (error) {
    console.error('[Helius] Process transaction error:', error);
  }
}

let retryCount = 0;
let ws: WebSocket | null = null;

export function initializeHeliusWebSocket() {
  if (typeof window === 'undefined') return;

  const connect = () => {
    console.log('[Helius] Initializing WebSocket...');
    if (ws) {
      ws.close();
      ws = null;
    }

  // Add aggressive polling
  setInterval(async () => {
    const store = useUnifiedTokenStore.getState();
    const tokens = store.tokens;
    
    for (const token of tokens) {
      try {
        const connection = new Connection(`https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`);
        const info = await connection.getTokenSupply(new PublicKey(token.address));
        
        // Force token update if supply changed
        if (info) {
          store.updateToken(token.address, {
            lastChecked: Date.now()
          });
        }
      } catch (err) {
        console.error(`[Helius] Error polling token ${token.address}:`, err);
      }
    }
  }, 3000);

  try {
    ws = new WebSocket(`wss://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`);

    ws.onopen = () => {
      console.log('[Helius] Connected');
      useHeliusStore.getState().setConnected(true);
      retryCount = 0;
      
      // Subscribe to all existing tokens
      const store = useUnifiedTokenStore.getState();
      store.tokens.forEach(token => {
        if (ws?.readyState === WebSocket.OPEN) {
          subscribeToTokenUpdates(token.address);
        }
      });
    };

    ws.onmessage = async (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.method === 'accountNotification') {
          const signature = data.params.result.signature;
          const tokenAddress = data.params.result.accountId;
          await processTransaction(signature, tokenAddress);
        }
      } catch (error) {
        console.error('[Helius] Message processing error:', error);
      }
    };

    ws.onclose = () => {
      console.log('[Helius] Disconnected');
      useHeliusStore.getState().setConnected(false);

      if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttempts++;
        setTimeout(initializeHeliusWebSocket, RECONNECT_DELAY);
      }
    };

    ws.onerror = (error) => {
      console.error('[Helius] WebSocket error:', error);
    };

  } catch (error) {
    console.error('[Helius] Initialization error:', error);
    if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
      reconnectAttempts++;
      setTimeout(initializeHeliusWebSocket, RECONNECT_DELAY);
    }
  }
}

// Initialize connection
initializeHeliusWebSocket();
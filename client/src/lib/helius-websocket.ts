import { create } from 'zustand';
import { Connection, PublicKey, VersionedMessage } from '@solana/web3.js';
import { useUnifiedTokenStore } from './unified-token-store';
import WebSocket from 'isomorphic-ws';

// Constants
const HELIUS_API_KEY = '004f9b13-f526-4952-9998-52f5c7bec6ee';
const HELIUS_WS_URL = `wss://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;
const RECONNECT_DELAY = 5000;
const MAX_RECONNECT_ATTEMPTS = 5;

// TypeScript Interfaces
interface HeliusTrade {
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
  trades: Record<string, HeliusTrade[]>;
  isConnected: boolean;
  subscribedTokens: Set<string>;
  addTrade: (tokenAddress: string, trade: HeliusTrade) => void;
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
        [tokenAddress]: [trade, ...(state.trades[tokenAddress] || [])].slice(0, 1000),
      },
    }));

    // Update Unified Token Store with trade data
    const unifiedStore = useUnifiedTokenStore.getState();
    const solPrice = unifiedStore.tokens.find(t => t.address === tokenAddress)?.price || 0;

    if (!solPrice) {
      console.warn('[Helius] No SOL price available for trade calculation');
      return;
    }

    // Calculate trade volume in USD
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
  subscribeToToken: (tokenAddress) => {
    const { subscribedTokens } = get();
    if (subscribedTokens.has(tokenAddress)) return;

    if (ws?.readyState === WebSocket.OPEN) {
      // Subscribe to token account changes
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

      subscribedTokens.add(tokenAddress);
      set({ subscribedTokens });
      console.log('[Helius] Subscribed to token:', tokenAddress);
    }
  }
}));

let ws: WebSocket | null = null;
let reconnectTimeout: NodeJS.Timeout | null = null;
let reconnectAttempts = 0;

export function initializeHeliusWebSocket() {
  if (typeof window === 'undefined' || !HELIUS_API_KEY) return;

  const store = useHeliusStore.getState();

  // Cleanup existing connection if any
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
    ws = new WebSocket(HELIUS_WS_URL);

    ws.onopen = () => {
      console.log('[Helius] WebSocket connected');
      store.setConnected(true);
      reconnectAttempts = 0;

      // Resubscribe to existing tokens
      const { subscribedTokens } = store;
      subscribedTokens.forEach(tokenAddress => {
        store.subscribeToToken(tokenAddress);
      });
    };

    ws.onmessage = (event: WebSocket.MessageEvent) => {
      handleWebSocketMessage(event).catch(error => {
        console.error('[Helius] Error in message handler:', error);
      });
    };

    ws.onclose = () => {
      console.log('[Helius] WebSocket disconnected');
      store.setConnected(false);

      if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttempts++;
        console.log(`[Helius] Attempting reconnect ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}`);
        reconnectTimeout = setTimeout(initializeHeliusWebSocket, RECONNECT_DELAY);
      }
    };

    ws.onerror = (error) => {
      console.error('[Helius] WebSocket error:', error);
      store.setConnected(false);
    };

  } catch (error) {
    console.error('[Helius] Failed to initialize WebSocket:', error);
    store.setConnected(false);

    if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
      reconnectAttempts++;
      reconnectTimeout = setTimeout(initializeHeliusWebSocket, RECONNECT_DELAY);
    }
  }
}

async function handleWebSocketMessage(event: WebSocket.MessageEvent) {
  try {
    const data = JSON.parse(event.data.toString());

    // Handle account notifications
    if (data.method === 'accountNotification') {
      await handleAccountUpdate(data.params.result);
    }

  } catch (error) {
    console.error('[Helius] Error handling WebSocket message:', error);
  }
}

async function handleAccountUpdate(data: any) {
  try {
    if (!data.signature) return;

    console.log('[Helius] Processing signature:', data.signature);

    const connection = new Connection(`https://api.helius.xyz/v0/`, {
      commitment: 'confirmed',
    });

    const statuses = await connection.getSignatureStatuses([data.signature]);
    if (!statuses.value[0]) return;

    const tx = await connection.getTransaction(data.signature, {
      maxSupportedTransactionVersion: 0
    });

    if (!tx || !tx.meta) return;

    console.log('[Helius] Found valid transaction:', data.signature);

    const preBalances = tx.meta.preBalances;
    const postBalances = tx.meta.postBalances;
    const balanceChanges = postBalances.map((post, i) => post - preBalances[i]);

    const accountKeys = tx.transaction.message.getAccountKeys().keySegments().flat();
    if (!accountKeys) return;

    const preTokenBalances = tx.meta.preTokenBalances || [];
    const postTokenBalances = tx.meta.postTokenBalances || [];

    const isTokenTx = accountKeys.some(
      (key: PublicKey) => key.equals(new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'))
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

      const trade: HeliusTrade = {
        signature: data.signature,
        timestamp: tx.blockTime ? tx.blockTime * 1000 : Date.now(),
        tokenAddress: data.accountId,
        amount: Math.abs(balanceChanges[0]) / 1e9,
        price: tokenAmount,
        priceUsd: 0,
        buyer: isBuy ? accountKeys[1]?.toBase58() || '' : '',
        seller: !isBuy ? accountKeys[0]?.toBase58() || '' : '',
        type: isBuy ? 'buy' : 'sell'
      };

      console.log('[Helius] New trade:', {
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

// Initialize WebSocket connection on module load
initializeHeliusWebSocket();
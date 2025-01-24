import { create } from 'zustand';
import { Connection, PublicKey } from '@solana/web3.js';
import { usePumpPortalStore } from './pump-portal-websocket';

// Add debug flag
const DEBUG = false;

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
        [tokenAddress]: [trade, ...(state.trades[tokenAddress] || [])].slice(0, 1000),
      },
    }));

    // Update PumpPortal store with trade data
    const pumpPortalStore = usePumpPortalStore.getState();
    const solPrice = pumpPortalStore.solPrice;
    if (!solPrice) {
      console.warn('[Helius] No SOL price available for trade calculation');
      return;
    }

    // Calculate trade volume in USD
    const tradeVolumeUsd = trade.amount * solPrice;

    pumpPortalStore.addTradeToHistory(tokenAddress, {
      txType: trade.type,
      solAmount: trade.amount,
      traderPublicKey: trade.type === 'buy' ? trade.buyer : trade.seller,
      priceImpact: tradeVolumeUsd / 1000000,
      timestamp: trade.timestamp
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
        id: 'token-sub-' + tokenAddress,
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
      if (DEBUG) console.log('[Helius] Subscribed to token:', tokenAddress);
    }
  }
}));

let ws: WebSocket | null = null;
const HELIUS_API_KEY = import.meta.env.VITE_HELIUS_API_KEY;
const HELIUS_RPC_URL = `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;
const connection = new Connection(HELIUS_RPC_URL);

async function handleAccountUpdate(data: any) {
  try {
    if (!data.signature) return;

    if (DEBUG) {
      console.log('[Helius] Processing signature:', data.signature);
    }

    const statuses = await connection.getSignatureStatuses([data.signature]);
    if (!statuses.value[0]) return;

    const tx = await connection.getTransaction(data.signature, {
      maxSupportedTransactionVersion: 0
    });

    if (!tx || !tx.meta) return;

    console.log('[Helius] Found valid transaction:', {
      signature: data.signature,
      preBalances,
      postBalances,
      accountKeys: accountKeys.map(key => key.toString())
    });

    const preBalances = tx.meta.preBalances;
    const postBalances = tx.meta.postBalances;
    const balanceChanges = postBalances.map((post, i) => post - preBalances[i]);

    const accountKeys = tx.transaction.message.accountKeys;
    if (!accountKeys) return;

    const preTokenBalances = tx.meta.preTokenBalances || [];
    const postTokenBalances = tx.meta.postTokenBalances || [];

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

      const trade: TokenTrade = {
        signature: data.signature,
        timestamp: tx.blockTime ? tx.blockTime * 1000 : Date.now(),
        tokenAddress: data.accountId,
        amount: Math.abs(balanceChanges[0]) / 1e9,
        price: tokenAmount,
        priceUsd: 0,
        buyer: isBuy ? accountKeys[1]?.toString() || '' : '',
        seller: !isBuy ? accountKeys[0]?.toString() || '' : '',
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

function handleWebSocketMessage(event: MessageEvent) {
  try {
    const data = JSON.parse(event.data);

    // Handle token updates
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

  const store = useHeliusStore.getState();

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

    // Add connection timeout
    const connectionTimeout = setTimeout(() => {
      console.error('[Helius] Connection timeout');
      ws?.close();
    }, 10000);

    ws.onopen = () => {
      clearTimeout(connectionTimeout);
      console.log('[Helius] WebSocket connected');
      store.setConnected(true);
      reconnectAttempts = 0;

      // Send ping every 30 seconds to keep connection alive
      const pingInterval = setInterval(() => {
        if (ws?.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ jsonrpc: '2.0', method: 'ping' }));
        } else {
          clearInterval(pingInterval);
        }
      }, 30000);

      // Resubscribe to existing tokens
      const { subscribedTokens } = store;
      subscribedTokens.forEach(tokenAddress => {
        store.subscribeToToken(tokenAddress);
      });
    };

    ws.onmessage = handleWebSocketMessage;

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
      const errorDetails = {
        readyState: ws?.readyState,
        timestamp: new Date().toISOString(),
        reconnectAttempts
      };
      console.error('[Helius] WebSocket error:', error, errorDetails);
      store.setConnected(false);
    };

  } catch (error) {
    console.error('[Helius] Failed to initialize WebSocket:', error);
    store.setConnected(false);

    if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
      reconnectAttempts++;
      console.log(`[Helius] Attempting reconnect ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}`);
      reconnectTimeout = setTimeout(initializeHeliusWebSocket, RECONNECT_DELAY);
    }
  }
}

// Initialize WebSocket connection
initializeHeliusWebSocket();
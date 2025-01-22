// FILE: /src/lib/helius-websocket.ts

import { create } from 'zustand';
import { Connection, PublicKey } from '@solana/web3.js';
import { usePumpPortalStore } from './pump-portal-websocket';

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

    // Update PumpPortal store with trade data and calculate price impact
    const pumpPortalStore = usePumpPortalStore.getState();
    const solPrice = pumpPortalStore.solPrice || 100;

    // Calculate trade volume in USD
    const tradeVolumeUsd = trade.amount * solPrice;

    pumpPortalStore.addTradeToHistory(tokenAddress, {
      txType: trade.type,
      solAmount: trade.amount,
      traderPublicKey: trade.type === 'buy' ? trade.buyer : trade.seller,
      priceImpact: tradeVolumeUsd / 1000000, // Basic price impact calculation
      timestamp: trade.timestamp
    });
  },
  setConnected: (connected) => set({ isConnected: connected }),
  subscribeToToken: (tokenAddress) => {
    const { subscribedTokens } = get();
    if (subscribedTokens.has(tokenAddress)) return;

    if (ws?.readyState === WebSocket.OPEN) {
      // Subscribe to account updates
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

      // Also subscribe to all token program events for this token
      ws.send(JSON.stringify({
        jsonrpc: '2.0',
        id: 2,
        method: 'programSubscribe',
        params: [
          'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
          {
            commitment: 'confirmed',
            encoding: 'jsonParsed',
            filters: [
              {
                memcmp: {
                  offset: 0,
                  bytes: tokenAddress
                }
              }
            ]
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

    console.log('[Helius] Received account update:', {
      signature: data.signature,
      accountId: data.accountId,
      type: data.type,
      timestamp: new Date().toISOString()
    });

    // Verify transaction using getSignatureStatuses
    const statuses = await connection.getSignatureStatuses([data.signature]);
    if (!statuses.value[0]?.confirmationStatus) return;

    // Get full transaction details
    const tx = await connection.getTransaction(data.signature, {
      maxSupportedTransactionVersion: 0
    });

    if (!tx || !tx.meta) return;

    console.log('[Helius] Transaction details:', {
      signature: data.signature,
      blockTime: tx.blockTime,
      accountKeys: tx.transaction.message.getAccountKeys().map(key => key.toString()),
      preBalances: tx.meta.preBalances,
      postBalances: tx.meta.postBalances,
      preTokenBalances: tx.meta.preTokenBalances,
      postTokenBalances: tx.meta.postTokenBalances
    });

    // Extract token transfer information
    const preBalances = tx.meta.preBalances;
    const postBalances = tx.meta.postBalances;
    const balanceChanges = postBalances.map((post, i) => post - preBalances[i]);

    // Get account keys
    const accountKeys = tx.transaction.message.getAccountKeys();
    if (!accountKeys) return;

    // Extract token balance changes
    const preTokenBalances = tx.meta.preTokenBalances || [];
    const postTokenBalances = tx.meta.postTokenBalances || [];

    // Check if this is a token program transaction
    const isTokenTx = tx.transaction.message.accountKeys.some(
      key => key.equals(new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'))
    );

    if (!isTokenTx) return;

    // Find the relevant token account
    const tokenAccount = preTokenBalances.find(
      balance => balance.mint === data.accountId
    );

    if (!tokenAccount) return;

    // Calculate token amount change
    const tokenAmount = Math.abs(
      (postTokenBalances[0]?.uiTokenAmount.uiAmount || 0) -
      (preTokenBalances[0]?.uiTokenAmount.uiAmount || 0)
    );

    // Determine if this is a buy or sell based on token flow
    const isBuy = (postTokenBalances[0]?.uiTokenAmount.uiAmount || 0) >
                 (preTokenBalances[0]?.uiTokenAmount.uiAmount || 0);

    const trade: TokenTrade = {
      signature: data.signature,
      timestamp: tx.blockTime ? tx.blockTime * 1000 : Date.now(),
      tokenAddress: data.accountId,
      amount: Math.abs(balanceChanges[0]) / 1e9, // Convert lamports to SOL
      price: tokenAmount,
      priceUsd: 0, // Will be calculated using current SOL price
      buyer: isBuy ? accountKeys.get(1)?.toString() || '' : '',
      seller: !isBuy ? accountKeys.get(0)?.toString() || '' : '',
      type: isBuy ? 'buy' : 'sell'
    };

    console.log('[Helius] Processed trade:', trade);

    useHeliusStore.getState().addTrade(data.accountId, trade);

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

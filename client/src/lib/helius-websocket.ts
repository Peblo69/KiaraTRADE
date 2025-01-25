import { create } from 'zustand';
import { Connection, PublicKey } from '@solana/web3.js';
import { useUnifiedTokenStore } from './unified-token-store';

// Constants
const HELIUS_API_KEY = '004f9b13-f526-4952-9998-52f5c7bec6ee';
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

  addTrade: (tokenAddress, trade) => 
    set((state) => ({
      trades: {
        ...state.trades,
        [tokenAddress]: [trade, ...(state.trades[tokenAddress] || [])].slice(0, 100),
      },
    })),

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
    const store = useHeliusStore.getState();
    if (store.subscribedTokens.has(tokenAddress)) {
      console.log(`[Helius] Already subscribed to token: ${tokenAddress}`);
      return;
    }

    ws.send(JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'accountSubscribe',
      params: [
        tokenAddress,
        { encoding: 'jsonParsed', commitment: 'confirmed' }
      ]
    }));

    store.subscribedTokens.add(tokenAddress);
    console.log(`[Helius] Subscribed to token: ${tokenAddress}`);
  } catch (error) {
    console.error('[Helius] Subscribe error:', error);
  }
}

export function initializeHeliusWebSocket() {
  if (typeof window === 'undefined') return;

  console.log('[Helius] Initializing WebSocket...');

  try {
    ws = new WebSocket(HELIUS_WS_URL);

    ws.onopen = () => {
      console.log('[Helius] Connected');
      useHeliusStore.getState().setConnected(true);
      reconnectAttempts = 0;

      // Resubscribe to all tokens on reconnection
      useHeliusStore.getState().subscribedTokens.forEach(tokenAddress => {
        subscribeToTokenUpdates(tokenAddress);
      });
    };

    ws.onclose = () => {
      console.log('[Helius] WebSocket disconnected');
      useHeliusStore.getState().setConnected(false);

      if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttempts++;
        setTimeout(initializeHeliusWebSocket, RECONNECT_DELAY * Math.pow(1.5, reconnectAttempts));
      }
    };

    ws.onerror = (error) => {
      console.error('[Helius] WebSocket error:', error);
    };

    ws.onmessage = async (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.method === 'accountNotification') {
          const signature = data.params.result.signature;
          const tokenAddress = data.params.result.value.account.data.parsed.info.mint;

          console.log('[Helius] Processing transaction:', {
            signature,
            tokenAddress,
            data: data.params.result
          });

          await processTransaction(signature, tokenAddress);
        }
      } catch (error) {
        console.error('[Helius] Message processing error:', error);
      }
    };

  } catch (error) {
    console.error('[Helius] Initialization error:', error);
    if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
      reconnectAttempts++;
      setTimeout(initializeHeliusWebSocket, RECONNECT_DELAY * Math.pow(1.5, reconnectAttempts));
    }
  }
}

async function processTransaction(signature: string, tokenAddress: string) {
  try {
    const connection = new Connection(`https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`);
    const tx = await connection.getTransaction(signature, { 
      maxSupportedTransactionVersion: 0,
      commitment: 'confirmed'
    });

    if (!tx?.meta) return;

    // Get pre and post token balances
    const preBalances = tx.meta.preTokenBalances || [];
    const postBalances = tx.meta.postTokenBalances || [];

    if (preBalances.length === 0 || postBalances.length === 0) return;

    // Get SOL transfers (in lamports)
    const solTransfers = tx.meta.preBalances.map((pre: number, i: number) => {
      const post = tx.meta.postBalances[i];
      return (post - pre) / 1e9; // Convert lamports to SOL
    });

    // Calculate token amount change
    const preAmount = preBalances[0]?.uiTokenAmount.uiAmount || 0;
    const postAmount = postBalances[0]?.uiTokenAmount.uiAmount || 0;
    const tokenAmount = Math.abs(postAmount - preAmount);

    if (tokenAmount === 0) return; // Skip if no token transfer

    // Determine if it's a buy or sell
    const isBuy = postAmount > preAmount;

    // Get the SOL amount from the largest transfer
    const solAmount = Math.abs(Math.max(...solTransfers.filter(t => t !== 0)));

    // Calculate price in SOL per token
    const price = solAmount / tokenAmount;

    // Get buyer and seller addresses
    const accountKeys = tx.transaction.message.accountKeys;
    const addresses = accountKeys.map(key => key.toString());

    const store = useHeliusStore.getState();
    store.addTrade(tokenAddress, {
      signature,
      timestamp: tx.blockTime ? tx.blockTime * 1000 : Date.now(),
      tokenAddress,
      amount: tokenAmount,
      price,
      priceUsd: price * (useUnifiedTokenStore.getState().solPrice || 0),
      buyer: isBuy ? addresses[0] : addresses[1],
      seller: isBuy ? addresses[1] : addresses[0],
      type: isBuy ? 'buy' : 'sell'
    });

  } catch (error) {
    console.error('[Helius] Process transaction error:', error);
  }
}

// Initialize connection
initializeHeliusWebSocket();
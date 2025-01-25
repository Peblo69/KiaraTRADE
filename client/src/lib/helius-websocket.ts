import { create } from 'zustand';
import { Connection, PublicKey } from '@solana/web3.js';
import { useUnifiedTokenStore } from './unified-token-store';
import { usePumpPortalStore } from './pump-portal-websocket';

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

export function initializeHeliusWebSocket() {
  if (typeof window === 'undefined') return;

  console.log('[Helius] Initializing WebSocket...');

  try {
    ws = new WebSocket(HELIUS_WS_URL);

    ws.onopen = () => {
      console.log('[Helius] Connected');
      useHeliusStore.getState().setConnected(true);
      reconnectAttempts = 0;
    };

    ws.onclose = () => {
      console.log('[Helius] WebSocket disconnected');
      useHeliusStore.getState().setConnected(false);

      if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttempts++;
        setTimeout(initializeHeliusWebSocket, RECONNECT_DELAY);
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
          const tokenAddress = data.params.result.accountId;
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
      setTimeout(initializeHeliusWebSocket, RECONNECT_DELAY);
    }
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

    // Get token amounts
    const preAmount = preBalances[0]?.uiTokenAmount.uiAmount || 0;
    const postAmount = postBalances[0]?.uiTokenAmount.uiAmount || 0;

    if (preAmount === postAmount) return;

    // Calculate SOL amount involved
    const solTransfers = tx.meta.preBalances.map((pre, i) => {
      const post = tx.meta.postBalances[i];
      return (post - pre) / 1e9; // Convert lamports to SOL
    });

    // Get the largest SOL transfer (likely the trade amount)
    const solAmount = Math.abs(Math.max(...solTransfers.filter(t => t !== 0)));
    const tokenAmount = Math.abs(postAmount - preAmount);
    const price = solAmount / tokenAmount;
    const isBuy = postAmount > preAmount;

    // Get the buyer/seller wallets
    const wallets = tx.transaction.message.accountKeys.map(key => key.toString());
    const buyer = isBuy ? wallets[0] : wallets[1];
    const seller = isBuy ? wallets[1] : wallets[0];
    
    const store = useHeliusStore.getState();
    const solPrice = usePumpPortalStore.getState().solPrice || 0;
    
    store.addTrade(tokenAddress, {
      signature,
      timestamp: tx.blockTime ? tx.blockTime * 1000 : Date.now(),
      tokenAddress,
      amount: deltaAmount,
      price: price,
      priceUsd: price * solPrice,
      buyer: isBuy ? tx.transaction.message.accountKeys[0].toString() : tx.transaction.message.accountKeys[1].toString(),
      seller: !isBuy ? tx.transaction.message.accountKeys[0].toString() : tx.transaction.message.accountKeys[1].toString(),
      type: isBuy ? 'buy' : 'sell'
    });

    // Update token price in unified store
    useUnifiedTokenStore.getState().updateToken(tokenAddress, {
      price: price,
      priceUsd: price * solPrice,
      lastTradeTime: Date.now()
    });
  } catch (error) {
    console.error('[Helius] Process transaction error:', error);
  }
}

// Initialize connection
initializeHeliusWebSocket();
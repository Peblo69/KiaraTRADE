import { create } from "zustand";
import { Connection, PublicKey } from '@solana/web3.js';
import { useChartStore } from './chart-websocket';

// Constants
const HELIUS_WS_URL = `wss://mainnet.helius-rpc.com/?api-key=${process.env.VITE_HELIUS_API_KEY}`;
const RECONNECT_DELAY = 5000;
const MAX_RECONNECT_ATTEMPTS = 5;
const SOL_TOKEN_ADDRESS = 'So11111111111111111111111111111111111111112';

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
    if (!ws?.readyState === WebSocket.OPEN) {
      console.log('[Helius] WebSocket not ready, queuing subscription');
      return;
    }

    const { subscribedTokens } = get();
    if (subscribedTokens.has(tokenAddress)) return;

    // Subscribe to token program with filter
    ws.send(JSON.stringify({
      jsonrpc: '2.0',
      id: `sub-${tokenAddress}`,
      method: 'accountSubscribe',
      params: [
        tokenAddress,
        {
          commitment: 'confirmed',
          encoding: 'jsonParsed'
        }
      ]
    }));

    subscribedTokens.add(tokenAddress);
    console.log('[Helius] Subscribed to token:', tokenAddress);
  }
}));

let ws: WebSocket | null = null;
let reconnectAttempts = 0;

async function handleTokenTransaction(data: any) {
  try {
    if (!data.signature) return;

    const store = useHeliusStore.getState();
    const solPrice = store.solPrice;

    // Skip if we don't have SOL price
    if (!solPrice) {
      console.warn('[Helius] No SOL price available');
      return;
    }

    const connection = new Connection(HELIUS_WS_URL, 'confirmed');
    const tx = await connection.getTransaction(data.signature);

    if (!tx?.meta) return;

    console.log('[Helius] Processing transaction:', {
      signature: data.signature,
      solPrice,
      meta: tx.meta
    });

    const preBalances = tx.meta.preBalances;
    const postBalances = tx.meta.postBalances;
    const preTokenBalances = tx.meta.preTokenBalances || [];
    const postTokenBalances = tx.meta.postTokenBalances || [];

    // Calculate SOL amount change
    const solChange = postBalances.map((post, i) => post - preBalances[i])
      .reduce((a, b) => Math.abs(a) + Math.abs(b), 0) / 1e9;

    // Calculate token amount change
    for (const tokenBalance of [...preTokenBalances, ...postTokenBalances]) {
      if (!tokenBalance) continue;

      const tokenMint = tokenBalance.mint;
      const preAmount = preTokenBalances.find(b => b?.accountIndex === tokenBalance.accountIndex)?.uiTokenAmount.uiAmount || 0;
      const postAmount = postTokenBalances.find(b => b?.accountIndex === tokenBalance.accountIndex)?.uiTokenAmount.uiAmount || 0;
      const tokenAmount = Math.abs(postAmount - preAmount);

      if (tokenAmount === 0) continue;

      // Calculate price in USD using SOL amount
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

      console.log('[Helius] Processed trade:', {
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
  if (typeof window === 'undefined') return;

  // Start SOL price updates
  updateSolPrice();
  setInterval(updateSolPrice, 10000);

  try {
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
        if (data.method === 'accountNotification') {
          await handleTokenTransaction(data.params.result);
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
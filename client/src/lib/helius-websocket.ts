// client/src/lib/helius-websocket.ts

import { create } from 'zustand';
import { usePumpPortalStore } from './pump-portal-websocket';
import type { TokenMetrics, TokenTrade, TimeWindow } from '@/types/token';

// Debug flag for development
const DEBUG = true;

interface HeliusStore {
  trades: Record<string, TokenTrade[]>;
  metrics: Record<string, TokenMetrics>;
  isConnected: boolean;
  subscribedTokens: string[];
  addTrade: (tokenAddress: string, trade: TokenTrade) => void;
  updateMetrics: (tokenAddress: string, updates: Partial<TokenMetrics>) => void;
  setConnected: (connected: boolean) => void;
  subscribeToToken: (tokenAddress: string) => void;
  getTokenMetrics: (tokenAddress: string) => TokenMetrics | null;
}

function createEmptyTimeWindow(startTime: number): TimeWindow {
  return {
    startTime,
    endTime: startTime + 60000,
    openPrice: 0,
    closePrice: 0,
    highPrice: 0,
    lowPrice: 0,
    volume: 0,
    trades: 0,
    buys: 0,
    sells: 0
  };
}

function createEmptyMetrics(): TokenMetrics {
  const now = Date.now();
  return {
    price: 0,
    priceUSD: 0,
    marketCap: 0,
    liquidity: 0,
    volume24h: 0,
    trades24h: 0,
    buys24h: 0,
    sells24h: 0,
    walletCount: 0,
    holders: new Set(),
    whales: new Set(),
    smartMoneyWallets: new Set(),
    priceHistory: [],
    timeWindows: {
      '1m': createEmptyTimeWindow(now),
      '5m': createEmptyTimeWindow(now),
      '15m': createEmptyTimeWindow(now),
      '1h': createEmptyTimeWindow(now)
    },
    recentTrades: []
  };
}

export const useHeliusStore = create<HeliusStore>((set, get) => ({
  trades: {},
  metrics: {},
  isConnected: false,
  subscribedTokens: [],

  addTrade: (tokenAddress, trade) => {
    console.log('[Helius] Adding trade for token:', tokenAddress, trade);

    set((state) => {
      // Get or create metrics for this token
      const metrics = state.metrics[tokenAddress] || createEmptyMetrics();

      // Update basic metrics
      metrics.price = trade.price;
      metrics.priceUSD = trade.priceUSD;
      metrics.marketCap = trade.priceUSD * 1000000000; // Assuming 1B total supply
      metrics.liquidity = metrics.price * 1000000; // Rough liquidity estimate

      // Update 24h stats
      metrics.volume24h += trade.volume;
      metrics.trades24h++;
      if (trade.isBuy) metrics.buys24h++;
      else metrics.sells24h++;

      // Update recent trades
      metrics.recentTrades = [trade, ...(metrics.recentTrades || [])].slice(0, 100);

      // Update price history
      metrics.priceHistory.push({
        time: Math.floor(trade.timestamp / 1000),
        open: trade.price,
        high: trade.price,
        low: trade.price,
        close: trade.price,
        volume: trade.volume
      });

      return {
        trades: {
          ...state.trades,
          [tokenAddress]: [trade, ...(state.trades[tokenAddress] || [])].slice(0, 1000),
        },
        metrics: {
          ...state.metrics,
          [tokenAddress]: metrics
        }
      };
    });
  },

  updateMetrics: (tokenAddress, updates) => {
    set((state) => ({
      metrics: {
        ...state.metrics,
        [tokenAddress]: {
          ...(state.metrics[tokenAddress] || createEmptyMetrics()),
          ...updates
        }
      }
    }));
  },

  setConnected: (connected) => {
    console.log('[Helius] Connection status:', connected);
    set({ isConnected: connected });
  },

  subscribeToToken: (tokenAddress) => {
    console.log('[Helius] Attempting to subscribe to token:', tokenAddress);

    const { subscribedTokens } = get();
    if (subscribedTokens.includes(tokenAddress)) {
      console.log('[Helius] Already subscribed to token:', tokenAddress);
      return;
    }

    if (!ws || ws.readyState !== WebSocket.OPEN) {
      console.log('[Helius] WebSocket not ready, cannot subscribe');
      return;
    }

    try {
      ws.send(JSON.stringify({
        jsonrpc: '2.0',
        id: `token-sub-${tokenAddress}`,
        method: 'accountSubscribe',
        params: [
          tokenAddress,
          {
            encoding: 'jsonParsed',
            commitment: 'confirmed',
            transactionDetails: 'full',
            showEvents: true
          }
        ]
      }));

      set({ subscribedTokens: [...subscribedTokens, tokenAddress] });
      console.log('[Helius] Successfully subscribed to token:', tokenAddress);
    } catch (error) {
      console.error('[Helius] Failed to subscribe to token:', tokenAddress, error);
    }
  },

  getTokenMetrics: (tokenAddress) => {
    const state = get();
    return state.metrics[tokenAddress] || null;
  }
}));

let ws: WebSocket | null = null;
const HELIUS_API_KEY = import.meta.env.VITE_HELIUS_API_KEY;
const HELIUS_RPC_URL = `wss://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;

let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS_HELIUS = Infinity;

const PING_INTERVAL_HELIUS = 30000; // 30 seconds
const PING_TIMEOUT_HELIUS = 5000; // 5 seconds
let pingIntervalHelius: NodeJS.Timeout | null = null;
let pingTimeoutHelius: NodeJS.Timeout | null = null;

function handleAccountUpdate(data: any) {
  console.log('[Helius] Received account update:', data);

  if (!data?.signature) {
    console.log('[Helius] No signature in update, skipping');
    return;
  }

  const store = useHeliusStore.getState();
  const pumpPortalStore = usePumpPortalStore.getState();
  const activeTokens = pumpPortalStore.getActiveTokens();

  // Only process trades for active tokens
  if (!activeTokens.includes(data.accountId)) {
    console.log('[Helius] Token not active, skipping:', data.accountId);
    return;
  }

  // Implement real trade data extraction from `data`
  const realTrade: TokenTrade | null = extractTradeData(data);

  if (realTrade) {
    store.addTrade(data.accountId, realTrade);
    console.log('[Helius] Added real trade:', realTrade);
  } else {
    console.error('[Helius] Failed to extract trade data from:', data);
  }
}

function extractTradeData(data: any): TokenTrade | null {
  try {
    // Parse the actual trade data structure from Helius
    // This implementation depends on the structure of `data`
    // Adjust the following fields based on the actual data received
    return {
      signature: data.signature,
      timestamp: data.blockTime * 1000, // Assuming blockTime is in seconds
      price: parseFloat(data.price), // Replace with actual price extraction
      priceUSD: parseFloat(data.priceUSD), // Replace with actual USD price extraction
      volume: parseFloat(data.volume), // Replace with actual volume extraction
      isBuy: data.isBuy, // Determine if it's a buy or sell based on data
      wallet: data.wallet, // Extract wallet information
      priceImpact: parseFloat(data.priceImpact) // Calculate or extract price impact
    };
  } catch (error) {
    console.error('[Helius] Error extracting trade data:', error);
    return null;
  }
}

export function initializeHeliusWebSocket() {
  if (typeof window === 'undefined') return;
  if (!HELIUS_API_KEY) {
    console.error('[Helius] No API key found');
    return;
  }

  const store = useHeliusStore.getState();

  function cleanup() {
    if (pingIntervalHelius) clearInterval(pingIntervalHelius);
    if (pingTimeoutHelius) clearTimeout(pingTimeoutHelius);
    if (ws) {
      try {
        ws.close();
      } catch (e) {
        console.error('[Helius] Error closing WebSocket:', e);
      }
      ws = null;
    }
  }

  function heartbeatHelius() {
    if (pingTimeoutHelius) clearTimeout(pingTimeoutHelius);
    pingTimeoutHelius = setTimeout(() => {
      console.log('[Helius] Connection dead (ping timeout) - reconnecting...');
      ws?.close();
    }, PING_TIMEOUT_HELIUS);
  }

  function startHeartbeatHelius() {
    if (pingIntervalHelius) clearInterval(pingIntervalHelius);
    pingIntervalHelius = setInterval(() => {
      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, PING_INTERVAL_HELIUS);
  }

  function connect() {
    cleanup();
    try {
      console.log('[Helius] Initializing WebSocket...');
      ws = new WebSocket(HELIUS_RPC_URL);

      ws.onopen = () => {
        console.log('[Helius] WebSocket connected');
        store.setConnected(true);
        reconnectAttempts = 0;

        // Start heartbeat
        startHeartbeatHelius();
        heartbeatHelius();

        // Resubscribe to existing tokens
        const { subscribedTokens } = store;
        subscribedTokens.forEach(tokenAddress => {
          store.subscribeToToken(tokenAddress);
        });
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('[Helius] Received message:', data);

          // Reset heartbeat on any message
          heartbeatHelius();

          if (data.type === 'pong') {
            heartbeatHelius();
          }

          if (data.method === 'accountNotification') {
            handleAccountUpdate(data.params.result);
          }
        } catch (error) {
          console.error('[Helius] Error handling message:', error);
        }
      };

      ws.onclose = () => {
        console.log('[Helius] WebSocket disconnected');
        store.setConnected(false);
        cleanup();

        if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS_HELIUS) {
          reconnectAttempts++;
          const delay = Math.min(1000 * 2 ** reconnectAttempts, 30000); // Exponential backoff up to 30 seconds
          console.log(`[Helius] Attempting reconnect in ${delay / 1000} seconds`);
          setTimeout(connect, delay);
        }
      };

      ws.onerror = (error) => {
        console.error('[Helius] WebSocket error:', error);
        store.setConnected(false);
      };

    } catch (error) {
      console.error('[Helius] Failed to initialize WebSocket:', error);
      store.setConnected(false);

      if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS_HELIUS) {
        reconnectAttempts++;
        const delay = Math.min(1000 * 2 ** reconnectAttempts, 30000);
        console.log(`[Helius] Attempting reconnect in ${delay / 1000} seconds`);
        setTimeout(connect, delay);
      }
    }
  }

  // Start initial connection
  connect();

  // Cleanup on unmount
  return cleanup;
}

import { Connection, PublicKey } from '@solana/web3.js';
import { create } from "zustand";
import { usePumpPortalStore } from './pump-portal-websocket';
import type { TokenMetrics, TokenTrade, TimeWindow } from '@/types/token';

const DEBUG = true;

// WebSocket configuration
const PING_INTERVAL = 15000; // 15 seconds
const PING_TIMEOUT = 5000;  // 5 seconds
const RECONNECT_BASE_DELAY = 1000; // Start with 1 second
const MAX_RECONNECT_DELAY = 30000; // 30 seconds

// Helius connection configuration
const HELIUS_API_KEY = import.meta.env.VITE_HELIUS_API_KEY;
const HELIUS_RPC_URL = `wss://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;
const connection = new Connection(`https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`);

interface HeliusStore {
  trades: Record<string, TokenTrade[]>;
  metrics: Record<string, TokenMetrics>;
  isConnected: boolean;
  subscribedTokens: Set<string>;
  pendingSubscriptions: Set<string>;
  addTrade: (tokenAddress: string, trade: TokenTrade) => void;
  updateMetrics: (tokenAddress: string, updates: Partial<TokenMetrics>) => void;
  setConnected: (connected: boolean) => void;
  subscribeToToken: (tokenAddress: string) => void;
}

// Initialize empty metrics with proper structure
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
      '1m': createTimeWindow(now, 60000),
      '5m': createTimeWindow(now, 300000),
      '15m': createTimeWindow(now, 900000),
      '1h': createTimeWindow(now, 3600000)
    },
    recentTrades: []
  };
}

function createTimeWindow(startTime: number, duration: number): TimeWindow {
  return {
    startTime,
    endTime: startTime + duration,
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

export const useHeliusStore = create<HeliusStore>((set, get) => ({
  trades: {},
  metrics: {},
  isConnected: false,
  subscribedTokens: new Set(),
  pendingSubscriptions: new Set(),

  addTrade: (tokenAddress, trade) => {
    if (DEBUG) console.log('[Helius] Processing trade:', tokenAddress, trade);

    set((state) => {
      const metrics = state.metrics[tokenAddress] || createEmptyMetrics();
      const now = Date.now();

      // Update basic metrics
      if (trade.price > 0) {
        metrics.price = trade.price;
        metrics.priceUSD = trade.priceUSD;

        // Calculate market cap if we have supply info
        if (trade.supply && trade.supply > 0) {
          metrics.marketCap = trade.priceUSD * trade.supply;
          metrics.liquidity = trade.liquidity || (trade.price * trade.supply * 0.1);
        }

        // Update 24h metrics
        if (now - trade.timestamp < 86400000) {
          metrics.volume24h += trade.volume;
          metrics.trades24h++;
          if (trade.isBuy) metrics.buys24h++;
          else metrics.sells24h++;
        }

        // Update time windows
        const windows = ['1m', '5m', '15m', '1h'] as const;
        windows.forEach(window => {
          const data = metrics.timeWindows[window];
          if (trade.timestamp >= data.endTime) {
            const duration = {
              '1m': 60000,
              '5m': 300000,
              '15m': 900000,
              '1h': 3600000
            }[window];

            metrics.timeWindows[window] = createTimeWindow(trade.timestamp, duration);
            metrics.timeWindows[window].openPrice = trade.price;
          }

          const windowData = metrics.timeWindows[window];
          windowData.closePrice = trade.price;
          windowData.highPrice = Math.max(windowData.highPrice || 0, trade.price);
          windowData.lowPrice = windowData.lowPrice === 0 ?
            trade.price : Math.min(windowData.lowPrice, trade.price);
          windowData.volume += trade.volume;
          windowData.trades++;
          if (trade.isBuy) windowData.buys++;
          else windowData.sells++;
        });

        // Update price history
        metrics.priceHistory.push({
          time: Math.floor(trade.timestamp / 1000),
          open: trade.price,
          high: trade.price,
          low: trade.price,
          close: trade.price,
          volume: trade.volume
        });

        // Keep only last 24h of price history
        metrics.priceHistory = metrics.priceHistory
          .filter(p => now - p.time * 1000 <= 86400000)
          .sort((a, b) => a.time - b.time);

        // Track traders
        if (trade.wallet) {
          metrics.holders.add(trade.wallet);
          metrics.walletCount = metrics.holders.size;

          // Track whales (trades > 1% of 24h volume)
          if (trade.volume > metrics.volume24h * 0.01) {
            metrics.whales.add(trade.wallet);
          }
        }
      }

      // Update recent trades
      metrics.recentTrades = [trade, ...(metrics.recentTrades || [])].slice(0, 100);

      return {
        trades: {
          ...state.trades,
          [tokenAddress]: [trade, ...(state.trades[tokenAddress] || [])].slice(0, 1000)
        },
        metrics: {
          ...state.metrics,
          [tokenAddress]: metrics
        }
      };
    });

    // Update PumpPortal store
    usePumpPortalStore.getState().updateLastTradeTime(tokenAddress);
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
    if (DEBUG) console.log('[Helius] Connection status:', connected);
    set({ isConnected: connected });
  },

  subscribeToToken: (tokenAddress) => {
    if (DEBUG) console.log('[Helius] Subscribing to token:', tokenAddress);

    const state = get();
    if (state.subscribedTokens.has(tokenAddress)) {
      if (DEBUG) console.log('[Helius] Already subscribed to:', tokenAddress);
      return;
    }

    if (state.pendingSubscriptions.has(tokenAddress)) {
      if (DEBUG) console.log('[Helius] Subscription pending for:', tokenAddress);
      return;
    }

    if (!ws || ws.readyState !== WebSocket.OPEN) {
      console.error('[Helius] WebSocket not ready, queueing subscription for:', tokenAddress);
      state.pendingSubscriptions.add(tokenAddress);
      return;
    }

    try {
      // Subscribe to token account updates
      const tokenSubId = `token-sub-${tokenAddress}`;
      ws.send(JSON.stringify({
        jsonrpc: '2.0',
        id: tokenSubId,
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

      // Also subscribe to mint account
      const mintSubId = `mint-sub-${tokenAddress}`;
      ws.send(JSON.stringify({
        jsonrpc: '2.0',
        id: mintSubId,
        method: 'accountSubscribe',
        params: [
          new PublicKey(tokenAddress).toBase58(),
          { commitment: 'confirmed', encoding: 'jsonParsed' }
        ]
      }));

      state.pendingSubscriptions.add(tokenAddress);
      if (DEBUG) console.log('[Helius] Subscription requests sent for:', tokenAddress);
    } catch (error) {
      console.error('[Helius] Failed to subscribe to token:', tokenAddress, error);
    }
  }
}));

let ws: WebSocket | null = null;
let pingInterval: NodeJS.Timeout | null = null;
let pingTimeout: NodeJS.Timeout | null = null;
let reconnectAttempts = 0;

function heartbeat() {
  if (DEBUG) console.log('[Helius] Heartbeat received');
  if (pingTimeout) clearTimeout(pingTimeout);
  pingTimeout = setTimeout(() => {
    console.log('[Helius] Connection dead (ping timeout) - reconnecting...');
    ws?.close();
  }, PING_TIMEOUT);
}

function startHeartbeat() {
  if (pingInterval) clearInterval(pingInterval);
  pingInterval = setInterval(() => {
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ jsonrpc: '2.0', method: 'ping' }));
      if (DEBUG) console.log('[Helius] Ping sent');
    }
  }, PING_INTERVAL);
}

async function processTransaction(signature: string, tokenAddress: string) {
  try {
    if (DEBUG) console.log('[Helius] Processing transaction:', signature);

    const tx = await connection.getTransaction(signature, {
      maxSupportedTransactionVersion: 0
    });

    if (!tx?.meta) {
      console.error('[Helius] No transaction metadata found for:', signature);
      return;
    }

    // Extract pre and post balances
    const preBalances = tx.meta.preBalances;
    const postBalances = tx.meta.postBalances;
    const preTokenBalances = tx.meta.preTokenBalances || [];
    const postTokenBalances = tx.meta.postTokenBalances || [];

    // Find relevant token balance changes
    const tokenChanges = postTokenBalances.map(post => {
      const pre = preTokenBalances.find(p => p.accountIndex === post.accountIndex);
      return {
        accountIndex: post.accountIndex,
        mint: post.mint,
        preAmount: pre?.uiTokenAmount.uiAmount || 0,
        postAmount: post.uiTokenAmount.uiAmount || 0,
        owner: post.owner,
        supply: post.uiTokenAmount.uiAmount || 0
      };
    }).filter(change =>
      change.mint === tokenAddress &&
      Math.abs(change.postAmount - change.preAmount) > 0
    );

    if (tokenChanges.length === 0) {
      if (DEBUG) console.log('[Helius] No relevant token changes in tx:', signature);
      return;
    }

    for (const change of tokenChanges) {
      const tokenAmount = Math.abs(change.postAmount - change.preAmount);
      const isBuy = change.postAmount > change.preAmount;

      // Find the associated SOL balance change
      let maxSolChange = 0;
      tx.meta.innerInstructions?.forEach(inner => {
        inner.instructions.forEach(ix => {
          if (ix.program === 'system' && ix.parsed?.type === 'transfer') {
            const solChange = ix.parsed.info.lamports / 1e9;
            maxSolChange = Math.max(maxSolChange, solChange);
          }
        });
      });

      const solChange = maxSolChange || Math.abs(postBalances[change.accountIndex] - preBalances[change.accountIndex]) / 1e9;

      if (solChange === 0 || tokenAmount === 0) {
        if (DEBUG) console.log('[Helius] Invalid amounts:', { solChange, tokenAmount });
        continue;
      }

      // Get SOL price in USD from your preferred price feed
      // For now using approximate $20 per SOL
      const SOL_PRICE_USD = 20;

      const trade: TokenTrade = {
        signature,
        timestamp: (tx.blockTime || Date.now() / 1000) * 1000,
        price: solChange / tokenAmount,
        priceUSD: (solChange / tokenAmount) * SOL_PRICE_USD,
        volume: solChange * SOL_PRICE_USD,
        isBuy,
        wallet: change.owner,
        priceImpact: 0, // Calculate based on liquidity pool size if available
        supply: change.supply,
        liquidity: solChange * 2, // Estimate based on pool size
        buyer: isBuy ? change.owner : undefined,
        seller: !isBuy ? change.owner : undefined
      };

      if (DEBUG) console.log('[Helius] Created trade:', trade);
      useHeliusStore.getState().addTrade(tokenAddress, trade);
    }
  } catch (error) {
    console.error('[Helius] Error processing transaction:', error);
  }
}

function handleAccountUpdate(data: any) {
  if (!data?.signature || !data?.accountId) {
    // Check if we have a valid account notification format
    if (data?.context?.slot && data?.value) {
      // This is a mint account or token account update
      // Extract relevant data from value
      const value = data.value;
      if (value.data?.program === 'spl-token' && value.data.parsed?.type === 'mint') {
        // Process mint info
        const mintInfo = value.data.parsed.info;
        if (DEBUG) console.log('[Helius] Received mint info:', mintInfo);
        return;
      }
    }
    if (DEBUG) console.log('[Helius] Skipping invalid update data:', data);
    return;
  }

  const store = useHeliusStore.getState();
  const pumpPortalStore = usePumpPortalStore.getState();
  const activeTokens = pumpPortalStore.getActiveTokens();

  // Only process updates for active tokens
  if (!activeTokens.includes(data.accountId)) {
    if (DEBUG) console.log('[Helius] Skipping inactive token:', data.accountId);
    return;
  }

  processTransaction(data.signature, data.accountId);
}

function handleSubscriptionResponse(data: any) {
  if (!data?.id) return;

  const store = useHeliusStore.getState();
  const [type, address] = data.id.split('-');

  if (type !== 'token-sub' && type !== 'mint-sub') return;

  if (data.error) {
    console.error(`[Helius] Subscription failed for ${address}:`, data.error);
    store.pendingSubscriptions.delete(address);
    return;
  }

  if (data.result !== undefined) {
    if (DEBUG) console.log(`[Helius] Subscription confirmed for ${address}`);
    store.pendingSubscriptions.delete(address);
    store.subscribedTokens.add(address);
  }
}

function cleanup() {
  if (pingInterval) clearInterval(pingInterval);
  if (pingTimeout) clearTimeout(pingTimeout);
  if (ws) {
    try {
      ws.close();
    } catch (e) {
      console.error('[Helius] Error closing WebSocket:', e);
    }
    ws = null;
  }
}

export function initializeHeliusWebSocket() {
  if (typeof window === 'undefined') return;
  if (!HELIUS_API_KEY) {
    console.error('[Helius] No API key found');
    return;
  }

  if (DEBUG) console.log('[Helius] Initializing WebSocket...');

  // Cleanup existing connection
  cleanup();

  try {
    ws = new WebSocket(HELIUS_RPC_URL);

    ws.onopen = () => {
      if (DEBUG) console.log('[Helius] Connected');
      useHeliusStore.getState().setConnected(true);
      reconnectAttempts = 0;

      // Start heartbeat
      heartbeat();
      startHeartbeat();

      // Resubscribe to existing tokens
      const store = useHeliusStore.getState();
      const tokens = Array.from(new Set([...store.subscribedTokens, ...store.pendingSubscriptions]));
      store.subscribedTokens.clear();
      store.pendingSubscriptions.clear();

      tokens.forEach(tokenAddress => {
        store.subscribeToToken(tokenAddress);
      });
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (DEBUG) console.log('[Helius] Received:', data);

        if (data.method === 'accountNotification') {
          handleAccountUpdate(data.params.result);
        } else if (data.method === 'pong') {
          heartbeat();
        } else {
          handleSubscriptionResponse(data);
        }
      } catch (error) {
        console.error('[Helius] Error handling message:', error);
      }
    };

    ws.onclose = () => {
      console.log('[Helius] Disconnected');
      cleanup();
      useHeliusStore.getState().setConnected(false);

      // Exponential backoff for reconnection
      const delay = Math.min(RECONNECT_BASE_DELAY * Math.pow(2, reconnectAttempts), MAX_RECONNECT_DELAY);
      reconnectAttempts++;

      console.log(`[Helius] Attempting reconnect in ${delay/1000} seconds (attempt ${reconnectAttempts})`);
      setTimeout(initializeHeliusWebSocket, delay);
    };

    ws.onerror = (error) => {
      console.error('[Helius] WebSocket error:', error);
      useHeliusStore.getState().setConnected(false);
    };

  } catch (error) {
    console.error('[Helius] Failed to initialize:', error);
    useHeliusStore.getState().setConnected(false);
  }

  // Return cleanup function
  return cleanup;
}

// Initialize connection with infinite retries
initializeHeliusWebSocket();
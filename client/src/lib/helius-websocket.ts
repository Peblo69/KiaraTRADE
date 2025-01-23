import { create } from 'zustand';
import { Connection, PublicKey } from '@solana/web3.js';
import { usePumpPortalStore } from './pump-portal-websocket';
import type { TokenMetrics, TokenTrade, TimeWindow } from '@/types/token';

// Add debug flag
const DEBUG = false;

interface HeliusStore {
  trades: Record<string, TokenTrade[]>;
  metrics: Record<string, TokenMetrics>;
  isConnected: boolean;
  subscribedTokens: Set<string>;
  addTrade: (tokenAddress: string, trade: TokenTrade) => void;
  updateMetrics: (tokenAddress: string, updates: Partial<TokenMetrics>) => void;
  setConnected: (connected: boolean) => void;
  subscribeToToken: (tokenAddress: string) => void;
  getTokenMetrics: (tokenAddress: string) => TokenMetrics | null;
  analyzeWallet: (wallet: string) => { profitableTrades: number; totalTrades: number };
}

function createEmptyTimeWindow(startTime: number): TimeWindow {
  return {
    startTime,
    endTime: startTime + 60000, // 1 minute default
    openPrice: 0,
    closePrice: 0,
    highPrice: 0,
    lowPrice: Infinity,
    volume: 0,
    trades: 0,
    buys: 0,
    sells: 0
  };
}

// Initialize empty metrics
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
  subscribedTokens: new Set(),

  addTrade: (tokenAddress, trade) => {
    set((state) => {
      // Update trades
      const updatedTrades = {
        ...state.trades,
        [tokenAddress]: [trade, ...(state.trades[tokenAddress] || [])].slice(0, 1000),
      };

      // Get or create metrics for this token
      const metrics = state.metrics[tokenAddress] || createEmptyMetrics();

      // Update price and market metrics
      metrics.price = trade.price;
      metrics.priceUSD = trade.priceUSD;
      metrics.marketCap = trade.priceUSD * 1000000000; // Assuming 1B total supply

      // Update holders
      metrics.holders.add(trade.isBuy ? trade.buyer : trade.seller);
      metrics.walletCount = metrics.holders.size;

      // Update volumes
      const now = Date.now();
      const tradeAmount = trade.volume;

      if (now - trade.timestamp < 86400000) { // 24h
        metrics.volume24h += tradeAmount;
        metrics.trades24h++;
        if (trade.isBuy) metrics.buys24h++;
        else metrics.sells24h++;
      }

      // Update time windows
      const windows = ['1m', '5m', '15m', '1h'] as const;
      const durations = {
        '1m': 60000,
        '5m': 300000,
        '15m': 900000,
        '1h': 3600000
      };

      windows.forEach(window => {
        const duration = durations[window];
        const currentWindow = metrics.timeWindows[window];

        // Check if we need to create a new window
        if (trade.timestamp >= currentWindow.endTime) {
          metrics.timeWindows[window] = {
            startTime: Math.floor(trade.timestamp / duration) * duration,
            endTime: Math.floor(trade.timestamp / duration) * duration + duration,
            openPrice: trade.price,
            closePrice: trade.price,
            highPrice: trade.price,
            lowPrice: trade.price,
            volume: tradeAmount,
            trades: 1,
            buys: trade.isBuy ? 1 : 0,
            sells: trade.isBuy ? 0 : 1
          };
        } else {
          currentWindow.closePrice = trade.price;
          currentWindow.highPrice = Math.max(currentWindow.highPrice, trade.price);
          currentWindow.lowPrice = Math.min(currentWindow.lowPrice, trade.price);
          currentWindow.volume += tradeAmount;
          currentWindow.trades++;
          if (trade.isBuy) currentWindow.buys++;
          else currentWindow.sells++;
        }
      });

      // Update price history
      metrics.priceHistory.push({
        time: Math.floor(trade.timestamp / 1000),
        open: trade.price,
        high: trade.price,
        low: trade.price,
        close: trade.price,
        volume: tradeAmount
      });

      // Keep only last 24 hours of price history
      metrics.priceHistory = metrics.priceHistory
        .filter(p => now - p.time * 1000 <= 86400000)
        .sort((a, b) => a.time - b.time);

      // Update recent trades
      metrics.recentTrades = [trade, ...metrics.recentTrades].slice(0, 100);

      // Identify whales (wallets with > 1% of 24h volume)
      if (tradeAmount > metrics.volume24h * 0.01) {
        metrics.whales.add(trade.isBuy ? trade.buyer : trade.seller);
      }

      // Smart money detection (wallets with > 75% profitable trades)
      const trader = trade.isBuy ? trade.buyer : trade.seller;
      const traderStats = get().analyzeWallet(trader);
      if (traderStats.totalTrades > 5 && (traderStats.profitableTrades / traderStats.totalTrades) > 0.75) {
        metrics.smartMoneyWallets.add(trader);
      }

      // Update PumpPortal store to mark this token as having recent activity
      const pumpPortalStore = usePumpPortalStore.getState();
      pumpPortalStore.updateLastTradeTime(tokenAddress);

      return {
        trades: updatedTrades,
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

  setConnected: (connected) => set({ isConnected: connected }),

  subscribeToToken: (tokenAddress) => {
    const { subscribedTokens } = get();
    if (subscribedTokens.has(tokenAddress)) return;

    if (ws?.readyState === WebSocket.OPEN) {
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

      subscribedTokens.add(tokenAddress);
      set({ subscribedTokens });
      if (DEBUG) console.log('[Helius] Subscribed to token:', tokenAddress);
    }
  },

  getTokenMetrics: (tokenAddress) => {
    const state = get();
    return state.metrics[tokenAddress] || null;
  },

  analyzeWallet: (wallet) => {
    const state = get();
    let profitableTrades = 0;
    let totalTrades = 0;

    // Analyze all trades by this wallet across all tokens
    Object.values(state.trades).forEach(tokenTrades => {
      const walletTrades = tokenTrades.filter(t =>
        t.buyer === wallet || t.seller === wallet
      );

      totalTrades += walletTrades.length;

      // A trade is considered profitable if the price goes up after a buy
      // or down after a sell within the next hour
      walletTrades.forEach((trade, i) => {
        if (i === walletTrades.length - 1) return;

        const nextTrade = walletTrades[i + 1];
        const isProfit = trade.isBuy
          ? nextTrade.price > trade.price
          : nextTrade.price < trade.price;

        if (isProfit) profitableTrades++;
      });
    });

    return { profitableTrades, totalTrades };
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

    const tx = await connection.getTransaction(data.signature, {
      maxSupportedTransactionVersion: 0
    });

    if (!tx || !tx.meta) return;

    const preBalances = tx.meta.preBalances;
    const postBalances = tx.meta.postBalances;
    const balanceChanges = postBalances.map((post, i) => post - preBalances[i]);

    const accountKeys = tx.transaction.message.getAccountKeys();
    if (!accountKeys) return;

    const preTokenBalances = tx.meta.preTokenBalances || [];
    const postTokenBalances = tx.meta.postTokenBalances || [];

    // Check if this is a token transaction
    const isTokenTx = accountKeys.some(
      key => key.equals(new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'))
    );

    if (!isTokenTx) return;

    const store = useHeliusStore.getState();
    const pumpPortalStore = usePumpPortalStore.getState();

    // Only process trades for active tokens
    const activeTokens = pumpPortalStore.getActiveTokens();
    if (!activeTokens.includes(data.accountId)) {
      if (DEBUG) console.log('[Helius] Skipping inactive token:', data.accountId);
      return;
    }

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
      const solAmount = Math.abs(balanceChanges[0]) / 1e9;

      // Calculate price impact based on liquidity
      const metrics = store.getTokenMetrics(data.accountId);
      const priceImpact = metrics
        ? (solAmount / metrics.liquidity) * 100
        : 0;

      const trade: TokenTrade = {
        signature: data.signature,
        timestamp: tx.blockTime ? tx.blockTime * 1000 : Date.now(),
        tokenAddress: data.accountId,
        amount: tokenAmount,
        price: solAmount / tokenAmount,
        priceUSD: solAmount * 20, // Assuming SOL price ~$20 for now
        priceImpact,
        buyer: isBuy ? accountKeys[1].toBase58() : '',
        seller: !isBuy ? accountKeys[0].toBase58() : '',
        isBuy,
        wallet: isBuy ? accountKeys[1].toBase58() : accountKeys[0].toBase58(),
        volume: solAmount * 20 // USD volume
      };

      if (DEBUG) {
        console.log('[Helius] New trade:', {
          signature: trade.signature,
          type: trade.isBuy ? 'buy' : 'sell',
          amount: trade.amount,
          price: trade.price,
          priceImpact: trade.priceImpact
        });
      }

      store.addTrade(data.accountId, trade);
    }

  } catch (error) {
    console.error('[Helius] Error processing account update:', error);
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

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        // Handle token updates
        if (data.method === 'accountNotification') {
          handleAccountUpdate(data.params.result);
        }

      } catch (error) {
        console.error('[Helius] Error handling WebSocket message:', error);
      }
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
      console.log(`[Helius] Attempting reconnect ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}`);
      reconnectTimeout = setTimeout(initializeHeliusWebSocket, RECONNECT_DELAY);
    }
  }
}

// Initialize WebSocket connection
initializeHeliusWebSocket();
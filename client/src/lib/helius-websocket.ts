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
  priceImpact: number;
  buyer: string;
  seller: string;
  type: 'buy' | 'sell';
  isSmartMoney: boolean;
}

interface TokenMetrics {
  holders: Set<string>;
  whales: Set<string>;  // Wallets with significant holdings
  smartMoneyWallets: Set<string>;  // Wallets with profitable trade history
  volume1m: number;
  volume5m: number;
  volume15m: number;
  volume1h: number;
  volume24h: number;
  liquidityUSD: number;
  priceHistory: {
    timestamp: number;
    price: number;
    volume: number;
  }[];
  topBuyers: { wallet: string; volume: number }[];
  topSellers: { wallet: string; volume: number }[];
}

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

// Initialize empty metrics
function createEmptyMetrics(): TokenMetrics {
  return {
    holders: new Set(),
    whales: new Set(),
    smartMoneyWallets: new Set(),
    volume1m: 0,
    volume5m: 0,
    volume15m: 0,
    volume1h: 0,
    volume24h: 0,
    liquidityUSD: 0,
    priceHistory: [],
    topBuyers: [],
    topSellers: []
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

      // Update holders
      metrics.holders.add(trade.type === 'buy' ? trade.buyer : trade.seller);

      // Update volumes
      const now = Date.now();
      const tradeAmount = trade.amount * trade.priceUsd;

      if (now - trade.timestamp < 60000) metrics.volume1m += tradeAmount;
      if (now - trade.timestamp < 300000) metrics.volume5m += tradeAmount;
      if (now - trade.timestamp < 900000) metrics.volume15m += tradeAmount;
      if (now - trade.timestamp < 3600000) metrics.volume1h += tradeAmount;
      if (now - trade.timestamp < 86400000) metrics.volume24h += tradeAmount;

      // Update price history
      metrics.priceHistory.push({
        timestamp: trade.timestamp,
        price: trade.price,
        volume: tradeAmount
      });

      // Keep only last 24 hours of price history
      metrics.priceHistory = metrics.priceHistory
        .filter(p => now - p.timestamp <= 86400000)
        .sort((a, b) => a.timestamp - b.timestamp);

      // Update top traders
      const traderInfo = { wallet: trade.type === 'buy' ? trade.buyer : trade.seller, volume: tradeAmount };
      if (trade.type === 'buy') {
        metrics.topBuyers = [...metrics.topBuyers, traderInfo]
          .sort((a, b) => b.volume - a.volume)
          .slice(0, 20);
      } else {
        metrics.topSellers = [...metrics.topSellers, traderInfo]
          .sort((a, b) => b.volume - a.volume)
          .slice(0, 20);
      }

      // Identify whales (wallets with > 1% of 24h volume)
      if (tradeAmount > metrics.volume24h * 0.01) {
        metrics.whales.add(trade.type === 'buy' ? trade.buyer : trade.seller);
      }

      // Smart money detection (wallets with > 75% profitable trades)
      const trader = trade.type === 'buy' ? trade.buyer : trade.seller;
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
      // Subscribe to token account changes with new API format
      ws.send(JSON.stringify({
        jsonrpc: '2.0',
        id: 'token-sub-' + tokenAddress,
        method: 'accountSubscribe',
        params: [
          tokenAddress,
          {
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
        const isProfit = trade.type === 'buy' 
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

    // Use new getSignatureStatuses API
    const statuses = await connection.getSignatureStatuses([data.signature]);
    if (!statuses.value[0]) return;

    // Use new getTransaction API
    const tx = await connection.getTransaction(data.signature, {
      maxSupportedTransactionVersion: 0
    });

    if (!tx || !tx.meta) return;

    if (DEBUG) {
      console.log('[Helius] Found valid transaction:', data.signature);
    }

    const preBalances = tx.meta.preBalances;
    const postBalances = tx.meta.postBalances;
    const balanceChanges = postBalances.map((post, i) => post - preBalances[i]);

    // Use getAccountKeys() instead of accountKeys property
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
        ? (solAmount / metrics.liquidityUSD) * 100 
        : 0;

      const trade: TokenTrade = {
        signature: data.signature,
        timestamp: tx.blockTime ? tx.blockTime * 1000 : Date.now(),
        tokenAddress: data.accountId,
        amount: tokenAmount,
        price: solAmount / tokenAmount,
        priceUsd: solAmount * 20, // Assuming SOL price ~$20 for now
        priceImpact,
        buyer: isBuy ? accountKeys.get(1)?.toBase58() || '' : '',
        seller: !isBuy ? accountKeys.get(0)?.toBase58() || '' : '',
        type: isBuy ? 'buy' : 'sell',
        isSmartMoney: false // Will be updated by addTrade
      };

      if (DEBUG) {
        console.log('[Helius] New trade:', {
          signature: trade.signature,
          type: trade.type,
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
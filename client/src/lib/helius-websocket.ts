import { create } from 'zustand';
import { useTokenAnalyticsStore } from './token-analytics-websocket';

// Constants
const HELIUS_WS_URL = 'wss://mainnet.helius-rpc.com/?api-key=004f9b13-f526-4952-9998-52f5c7bec6ee';
const RECONNECT_DELAY = 5000;
const MAX_RECONNECT_ATTEMPTS = 5;
const MAX_CONCURRENT_TRANSACTIONS = 10;

// Regional Variables
let activeTransactions = 0;

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
    // Skip if we've reached max concurrent transactions
    if (activeTransactions >= MAX_CONCURRENT_TRANSACTIONS) {
      console.log('[Helius] Max concurrent transactions reached, skipping...');
      return;
    }

    // Check for sniper behavior (large buys within first 30 seconds)
    const analytics = useTokenAnalyticsStore.getState();
    const creationTime = analytics.creationTimes[tokenAddress];
    const isSniper = creationTime && trade.timestamp - creationTime <= 30000;
    
    if (isSniper && trade.type === 'buy') {
      const riskLevel = trade.amount > 5 ? 'high' : trade.amount > 2 ? 'medium' : 'low';
      analytics.updateAnalytics(tokenAddress, {
        analytics: {
          rugPullRisk: riskLevel,
          sniperCount: (analytics.analytics[tokenAddress]?.sniperCount || 0) + 1
        }
      });
    }

    activeTransactions++;

    try {
      set((state) => ({
        trades: {
          ...state.trades,
          [tokenAddress]: [trade, ...(state.trades[tokenAddress] || [])].slice(0, 100),
        },
      }));

      const analyticsStore = useTokenAnalyticsStore.getState();
      const creationTime = analyticsStore.creationTimes[tokenAddress];

      // Check if it's a sniper (within 30s of creation)
      if (creationTime && trade.timestamp - creationTime <= 30000 && trade.type === 'buy') {
        analyticsStore.addSniper(tokenAddress, trade.buyer, trade.amount, trade.timestamp);
      }

      // Update holder balances with verification
      if (trade.type === 'buy') {
        analyticsStore.updateHolder(tokenAddress, trade.buyer, trade.amount);
        if (trade.seller) {
          analyticsStore.updateHolder(tokenAddress, trade.seller, -trade.amount);
        }
      } else {
        analyticsStore.updateHolder(tokenAddress, trade.seller, -trade.amount);
        if (trade.buyer) {
          analyticsStore.updateHolder(tokenAddress, trade.buyer, trade.amount);
        }
      }
    } catch (error) {
      console.error('[Helius] Error processing trade:', error);
    } finally {
      activeTransactions--;
    }
  },

  setConnected: (connected) => set({ isConnected: connected }),

  subscribeToToken: (tokenAddress) => {
    if (!ws?.readyState === WebSocket.OPEN) {
      console.log('[Helius] WebSocket not ready, queuing subscription');
      return;
    }

    try {
      const store = get();
      if (store.subscribedTokens.has(tokenAddress)) {
        console.log(`[Helius] Already subscribed to token: ${tokenAddress}`);
        return;
      }

      // Subscribe to token program with filter
      ws.send(JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'programSubscribe',
        params: [
          'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
          {
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

      store.subscribedTokens.add(tokenAddress);
      console.log(`[Helius] Subscribed to token: ${tokenAddress}`);

      // Set creation time for snipers tracking
      useTokenAnalyticsStore.getState().setCreationTime(tokenAddress, Date.now());
    } catch (error) {
      console.error('[Helius] Subscribe error:', error);
    }
  }
}));

let ws: WebSocket | null = null;
let reconnectAttempts = 0;
let reconnectTimeout: NodeJS.Timeout | null = null;

function handleWebSocketError(error: Error) {
  console.error('[Helius] WebSocket error:', error);
  reconnectWebSocket();
}

function handleWebSocketClose() {
  console.log('[Helius] WebSocket disconnected');
  useHeliusStore.getState().setConnected(false);
  reconnectWebSocket();
}

function reconnectWebSocket() {
  if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
    console.log('[Helius] Max reconnection attempts reached');
    return;
  }

  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
  }

  const delay = RECONNECT_DELAY * Math.pow(1.5, reconnectAttempts);
  console.log(`[Helius] Attempting to reconnect in ${delay}ms...`);

  reconnectTimeout = setTimeout(() => {
    reconnectAttempts++;
    initializeHeliusWebSocket();
  }, delay);
}

function handleWebSocketMessage(event: MessageEvent) {
  try {
    const data = JSON.parse(event.data);

    if (data.method === 'programNotification') {
      const accountInfo = data.params.result.value.account;
      if (!accountInfo.data.parsed) return;

      const info = accountInfo.data.parsed.info;
      const tokenAddress = info.mint;
      const amount = parseFloat(info.amount || 0);

      let type: 'buy' | 'sell';
      let buyer: string;
      let seller: string;

      switch (info.type) {
        case 'mintTo':
          type = 'buy';
          buyer = info.newAuthority || info.owner;
          seller = '';
          break;
        case 'burn':
          type = 'sell';
          seller = info.authority || info.owner;
          buyer = '';
          break;
        case 'transfer':
          type = 'buy';
          buyer = info.destination;
          seller = info.source;
          break;
        default:
          return;
      }

      const timestamp = Date.now();

      useHeliusStore.getState().addTrade(tokenAddress, {
        signature: data.params.result.signature,
        timestamp,
        tokenAddress,
        amount,
        price: 0,
        priceUsd: 0,
        buyer,
        seller,
        type
      });
    }
  } catch (error) {
    console.error('[Helius] Message processing error:', error);
  }
}

export function initializeHeliusWebSocket() {
  if (typeof window === 'undefined') return;

  try {
    ws = new WebSocket(HELIUS_WS_URL);

    ws.onopen = () => {
      console.log('[Helius] Connected');
      useHeliusStore.getState().setConnected(true);
      reconnectAttempts = 0;

      // Resubscribe to all tokens
      const store = useHeliusStore.getState();
      store.subscribedTokens.forEach(tokenAddress => {
        store.subscribeToToken(tokenAddress);
      });
    };

    ws.onclose = handleWebSocketClose;
    ws.onerror = handleWebSocketError;
    ws.onmessage = handleWebSocketMessage;

  } catch (error) {
    console.error('[Helius] Initialization error:', error);
    reconnectWebSocket();
  }
}

// Initialize connection
initializeHeliusWebSocket();
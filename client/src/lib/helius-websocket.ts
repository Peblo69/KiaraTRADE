import { create } from 'zustand';
import { useTokenAnalyticsStore } from './token-analytics-websocket';

// Constants
const HELIUS_WS_URL = 'wss://mainnet.helius-rpc.com/?api-key=004f9b13-f526-4952-9998-52f5c7bec6ee';
const RECONNECT_DELAY = 5000;
const MAX_RECONNECT_ATTEMPTS = 5;
const SPL_TOKEN_PROGRAM_ID = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';

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

    // Update analytics in token analytics store
    const analyticsStore = useTokenAnalyticsStore.getState();

    // Check if it's a sniper (within 30s of creation)
    const creationTime = analyticsStore.creationTimes[tokenAddress];
    if (creationTime && trade.timestamp - creationTime <= 30000 && trade.type === 'buy') {
      analyticsStore.addSniper(tokenAddress, trade.buyer, trade.amount, trade.timestamp);
    }

    // Update holder balances
    if (trade.type === 'buy') {
      analyticsStore.updateHolder(tokenAddress, trade.buyer, trade.amount);
      if (trade.seller) {
        // Decrease seller's balance
        analyticsStore.updateHolder(tokenAddress, trade.seller, -trade.amount);
      }
    } else {
      analyticsStore.updateHolder(tokenAddress, trade.seller, -trade.amount);
      if (trade.buyer) {
        // Increase buyer's balance
        analyticsStore.updateHolder(tokenAddress, trade.buyer, trade.amount);
      }
    }
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
    const store = useHeliusStore.getState();
    if (store.subscribedTokens.has(tokenAddress)) {
      console.log(`[Helius] Already subscribed to token: ${tokenAddress}`);
      return;
    }

    // Subscribe to SPL Token program with filter for our token
    ws.send(JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'programSubscribe',
      params: [
        SPL_TOKEN_PROGRAM_ID,
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

        if (data.method === 'programNotification') {
          const accountInfo = data.params.result.value.account;
          if (!accountInfo.data.parsed) return;

          const info = accountInfo.data.parsed.info;
          const tokenAddress = info.mint;
          const amount = parseFloat(info.amount || 0);

          // Determine transaction type based on instruction type
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
              type = 'buy'; // From perspective of destination
              buyer = info.destination;
              seller = info.source;
              break;
            default:
              return; // Skip other instruction types
          }

          const timestamp = Date.now();

          console.log('[Helius] Token transfer:', {
            tokenAddress,
            amount,
            type,
            buyer,
            seller,
            timestamp
          });

          useHeliusStore.getState().addTrade(tokenAddress, {
            signature: data.params.result.signature,
            timestamp,
            tokenAddress,
            amount,
            price: 0, // We'll need market data for this
            priceUsd: 0,
            buyer,
            seller,
            type
          });
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

// Initialize connection
initializeHeliusWebSocket();
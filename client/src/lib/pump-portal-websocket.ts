import { create } from 'zustand';
import { preloadTokenImages } from './token-metadata';
import axios from 'axios';

// Constants 
const MAX_TRADES_PER_TOKEN = 100;
const WS_URL = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`;
const RECONNECT_DELAY = 5000;
const MAX_RECONNECT_ATTEMPTS = 5;
const SOL_PRICE_UPDATE_INTERVAL = 10_000;

export interface TokenTrade {
  // Trade identification
  signature: string;
  timestamp: number;

  // Core trade data
  mint: string;
  txType: 'buy' | 'sell';
  tokenAmount: number;
  solAmount: number;

  // Addresses
  traderPublicKey: string;
  counterpartyPublicKey: string;

  // Bonding curve state after trade
  bondingCurveKey: string;
  vTokensInBondingCurve: number;
  vSolInBondingCurve: number;
  marketCapSol: number;
}

export interface PumpPortalToken {
  // Basic token info
  symbol: string;
  name: string;
  address: string;
  imageLink?: string;

  // Raw bonding curve data 
  bondingCurveKey: string;
  vTokensInBondingCurve: number;
  vSolInBondingCurve: number;
  marketCapSol: number;

  // Trade history
  recentTrades: TokenTrade[];
}

interface PumpPortalStore {
  tokens: PumpPortalToken[];
  isConnected: boolean;
  solPrice: number;

  addToken: (tokenData: any) => void;
  addTradeToHistory: (address: string, tradeData: any) => void;
  setConnected: (connected: boolean) => void;
  setSolPrice: (price: number) => void;
}

export const usePumpPortalStore = create<PumpPortalStore>((set) => ({
  tokens: [],
  isConnected: false,
  solPrice: 0,

  addToken: (tokenData) => 
    set((state) => ({
      tokens: [mapTokenData(tokenData), ...state.tokens].slice(0, 50),
    })),

  addTradeToHistory: (address, tradeData) => 
    set((state) => ({
      tokens: state.tokens.map((t) => {
        if (t.address !== address) return t;

        // Create trade record with raw data
        const newTrade: TokenTrade = {
          signature: tradeData.signature,
          timestamp: Date.now(),
          mint: tradeData.mint,
          txType: tradeData.txType,
          tokenAmount: tradeData.tokenAmount,
          solAmount: tradeData.solAmount,
          traderPublicKey: tradeData.traderPublicKey,
          counterpartyPublicKey: tradeData.counterpartyPublicKey,
          bondingCurveKey: tradeData.bondingCurveKey,
          vTokensInBondingCurve: tradeData.vTokensInBondingCurve,
          vSolInBondingCurve: tradeData.vSolInBondingCurve,
          marketCapSol: tradeData.marketCapSol
        };

        // Update token state 
        return {
          ...t,
          recentTrades: [newTrade, ...t.recentTrades].slice(0, MAX_TRADES_PER_TOKEN),
          bondingCurveKey: tradeData.bondingCurveKey,
          vTokensInBondingCurve: tradeData.vTokensInBondingCurve,
          vSolInBondingCurve: tradeData.vSolInBondingCurve,
          marketCapSol: tradeData.marketCapSol
        };
      }),
    })),

  setConnected: (connected) => set({ isConnected: connected }),
  setSolPrice: (price) => set({ solPrice: price }),
}));

// Map raw token data 
function mapTokenData(data: any): PumpPortalToken {
  return {
    symbol: data.symbol || data.mint?.slice(0, 6) || 'Unknown',
    name: data.name || `Token ${data.mint?.slice(0, 8)}`,
    address: data.mint || '',
    imageLink: data.imageLink || 'https://via.placeholder.com/150',

    // Raw bonding curve data
    bondingCurveKey: data.bondingCurveKey,
    vTokensInBondingCurve: data.vTokensInBondingCurve,
    vSolInBondingCurve: data.vSolInBondingCurve,
    marketCapSol: data.marketCapSol,

    recentTrades: []
  };
}

// WebSocket connection
let ws: WebSocket | null = null;
let reconnectTimeout: NodeJS.Timeout | null = null;
let reconnectAttempts = 0;
let solPriceInterval: NodeJS.Timeout | null = null;

// Fetch SOL price from Binance
const fetchSolanaPrice = async (retries = 3): Promise<number> => {
  try {
    const response = await axios.get('https://api.binance.com/api/v3/ticker/price?symbol=SOLUSDT');
    const price = Number(response.data.price);
    if (!isNaN(price) && price > 0) {
      return price;
    }
  } catch (error) {
    console.error('[PumpPortal] Failed to fetch SOL price:', error);
    if (retries > 0) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return fetchSolanaPrice(retries - 1);
    }
  }
  return 100; // fallback price
};

// Cleanup function
function cleanup() {
  if (ws) {
    try { ws.close(); } catch {}
    ws = null;
  }
  if (solPriceInterval) {
    clearInterval(solPriceInterval);
    solPriceInterval = null;
  }
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
    reconnectTimeout = null;
  }
}

// Initialize WebSocket
export function initializePumpPortalWebSocket() {
  if (typeof window === 'undefined') return;

  cleanup();

  try {
    console.log('[PumpPortal] Initializing WebSocket...');
    ws = new WebSocket(WS_URL);
    const store = usePumpPortalStore.getState();

    // Get initial SOL price
    fetchSolanaPrice().then(price => {
      store.setSolPrice(price);
      solPriceInterval = setInterval(async () => {
        const newPrice = await fetchSolanaPrice();
        store.setSolPrice(newPrice);
      }, SOL_PRICE_UPDATE_INTERVAL);
    });

    ws.onopen = () => {
      console.log('[PumpPortal] WebSocket connected');
      store.setConnected(true);
      reconnectAttempts = 0;
    };

    ws.onmessage = async (event) => {
      try {
        const { type, data } = JSON.parse(event.data);

        switch (type) {
          case 'newToken': {
            console.log('[PumpPortal] New Token Details:', data);
            store.addToken(data);
            if (data.imageLink) {
              preloadTokenImages([{ imageLink: data.imageLink, symbol: data.symbol }]);
            }
            ws?.send(JSON.stringify({
              method: 'subscribeTokenTrade',
              keys: [data.mint],
            }));
            break;
          }
          case 'trade': {
            console.log('[PumpPortal] Trade Details:', data);
            store.addTradeToHistory(data.mint, data);
            break;
          }
        }
      } catch (error) {
        console.error('[PumpPortal] Failed to parse message:', error);
      }
    };

    ws.onclose = () => {
      console.log('[PumpPortal] WebSocket disconnected');
      store.setConnected(false);
      cleanup();

      if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttempts++;
        const delay = RECONNECT_DELAY * Math.pow(1.5, reconnectAttempts);
        reconnectTimeout = setTimeout(initializePumpPortalWebSocket, delay);
      }
    };

    ws.onerror = (error) => {
      console.error('[PumpPortal] WebSocket error:', error);
      store.setConnected(false);
    };

  } catch (error) {
    console.error('[PumpPortal] Failed to initialize WebSocket:', error);
    if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
      reconnectAttempts++;
      const delay = RECONNECT_DELAY * Math.pow(1.5, reconnectAttempts);
      reconnectTimeout = setTimeout(initializePumpPortalWebSocket, delay);
    }
  }
}

// Initialize on load
initializePumpPortalWebSocket();
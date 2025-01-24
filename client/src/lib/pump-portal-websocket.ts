import { create } from 'zustand';
import { preloadTokenImages } from './token-metadata';
import axios from 'axios';

// Constants
const TOTAL_SUPPLY = 1_000_000_000;
const SOL_PRICE_UPDATE_INTERVAL = 10000;
const MAX_TRADES_PER_TOKEN = 100;
const WS_URL = `ws://${window.location.host}/ws`; // Connect to our backend WebSocket
const RECONNECT_DELAY = 5000;
const MAX_RECONNECT_ATTEMPTS = 5;

export interface TimeWindowStats {
  startTime: number;
  endTime: number;
  openPrice: number;
  closePrice: number;
  highPrice: number;
  lowPrice: number;
  volume: number;
  trades: number;
  buys: number;
  sells: number;
}

export interface PumpPortalToken {
  symbol: string;
  name: string;
  address: string;
  price: number;
  marketCap: number;
  liquidity: number;
  liquidityChange: number;
  l1Liquidity: number;
  volume: number;
  volume24h: number;
  trades: number;
  trades24h: number;
  buys24h: number;
  sells24h: number;
  walletCount: number;
  timestamp: number;
  timeWindows: Record<string, TimeWindowStats>;
  recentTrades: TokenTrade[];
  status: TokenStatus;
  imageLink?: string;
}

interface TokenStatus {
  mad: boolean;
  fad: boolean;
  lb: boolean;
  tri: boolean;
}

interface TokenTrade {
  timestamp: number;
  price: number;
  volume: number;
  isBuy: boolean;
  wallet: string;
}

interface PumpPortalStore {
  tokens: PumpPortalToken[];
  isConnected: boolean;
  solPrice: number;
  addToken: (token: PumpPortalToken) => void;
  updateToken: (address: string, updates: Partial<PumpPortalToken>) => void;
  addTradeToHistory: (address: string, trade: any) => void;
  setConnected: (connected: boolean) => void;
  setSolPrice: (price: number) => void;
}

export const usePumpPortalStore = create<PumpPortalStore>((set, get) => ({
  tokens: [],
  isConnected: false,
  solPrice: 0,
  addToken: (token) => set((state) => ({
    tokens: [token, ...state.tokens].slice(0, 50),
  })),
  updateToken: (address, updates) => set((state) => ({
    tokens: state.tokens.map((token) =>
      token.address === address ? { ...token, ...updates } : token
    ),
  })),
  addTradeToHistory: (address, trade) => {
    const state = get();
    const token = state.tokens.find(t => t.address === address);
    if (!token || !state.solPrice) return;

    const now = Date.now();
    const tradeVolume = Number(trade.solAmount || 0) * state.solPrice;
    const isBuy = trade.txType === 'buy';

    const impact = Math.min((tradeVolume / (token.liquidity || 1)) * 0.005, 0.01);
    const newPrice = (token.price || 0) * (isBuy ? (1 + impact) : (1 - impact));

    const newTrade = {
      timestamp: now,
      price: newPrice,
      volume: tradeVolume,
      isBuy,
      wallet: trade.traderPublicKey
    };

    const recentTrades = [newTrade, ...(token.recentTrades || [])].slice(0, MAX_TRADES_PER_TOKEN);
    const last24h = now - 24 * 60 * 60 * 1000;
    const trades24h = recentTrades.filter(t => t.timestamp > last24h);

    set((state) => ({
      tokens: state.tokens.map(t =>
        t.address === address ? {
          ...t,
          price: newPrice,
          marketCap: newPrice * TOTAL_SUPPLY,
          liquidity: t.liquidity + (isBuy ? tradeVolume : -tradeVolume),
          volume: t.volume + tradeVolume,
          volume24h: trades24h.reduce((sum, t) => sum + t.volume, 0),
          trades: t.trades + 1,
          trades24h: trades24h.length,
          buys24h: trades24h.filter(t => t.isBuy).length,
          sells24h: trades24h.filter(t => !t.isBuy).length,
          recentTrades,
          walletCount: new Set(recentTrades.map(trade => trade.wallet)).size
        } : t
      )
    }));
  },
  setConnected: (connected) => set({ isConnected: connected }),
  setSolPrice: (price) => {
    if (price > 0) {
      set({ solPrice: price });
    }
  },
}));

export function mapPumpPortalData(data: any): PumpPortalToken {
  const {
    mint,
    vSolInBondingCurve,
    marketCapSol,
    bondingCurveKey,
    name,
    symbol,
    solAmount,
    traderPublicKey,
    imageLink,
  } = data;

  const solPrice = usePumpPortalStore.getState().solPrice || 0;
  const marketCapUsd = Number(marketCapSol || 0) * solPrice;
  const liquidityUsd = Number(vSolInBondingCurve || 0) * solPrice;
  const volumeUsd = Number(solAmount || 0) * solPrice;
  const priceUsd = marketCapUsd / TOTAL_SUPPLY || 0;

  const now = Date.now();
  return {
    symbol: symbol || mint?.slice(0, 6) || 'Unknown',
    name: name || `Token ${mint?.slice(0, 8)}`,
    address: mint || '',
    price: priceUsd,
    marketCap: marketCapUsd,
    liquidity: liquidityUsd,
    liquidityChange: 0,
    l1Liquidity: liquidityUsd,
    volume: volumeUsd,
    volume24h: volumeUsd,
    trades: 1,
    trades24h: 1,
    buys24h: 1,
    sells24h: 0,
    walletCount: 1,
    timestamp: now,
    timeWindows: {
      '1m': {
        startTime: now - 60000,
        endTime: now,
        openPrice: priceUsd,
        closePrice: priceUsd,
        highPrice: priceUsd,
        lowPrice: priceUsd,
        volume: volumeUsd,
        trades: 1,
        buys: 1,
        sells: 0
      }
    },
    recentTrades: [{
      timestamp: now,
      price: priceUsd,
      volume: volumeUsd,
      isBuy: true,
      wallet: traderPublicKey
    }],
    status: {
      mad: false,
      fad: false,
      lb: Boolean(bondingCurveKey),
      tri: false
    },
    imageLink: imageLink || 'https://via.placeholder.com/150',
  };
}

// WebSocket connection management
let ws: WebSocket | null = null;
let reconnectTimeout: NodeJS.Timeout | null = null;
let reconnectAttempts = 0;
let solPriceInterval: NodeJS.Timeout | null = null;

const API_ENDPOINTS = [
  {
    url: 'https://api.binance.com/api/v3/ticker/price?symbol=SOLUSDT',
    extract: (data: any) => Number(data?.price)
  }
];

const fetchSolanaPrice = async (retries = 3): Promise<number> => {
  const axiosInstance = axios.create({
    timeout: 5000,
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    }
  });

  for (const endpoint of API_ENDPOINTS) {
    for (let i = 0; i < retries; i++) {
      try {
        const response = await axiosInstance.get(endpoint.url);
        const price = endpoint.extract(response.data);

        if (typeof price === 'number' && price > 0) {
          return price;
        }
        throw new Error('Invalid price response');
      } catch (error: any) {
        const isLastAttempt = i === retries - 1;
        const isLastEndpoint = endpoint === API_ENDPOINTS[API_ENDPOINTS.length - 1];

        console.error(`[PumpPortal] Error fetching SOL price from ${endpoint.url} (attempt ${i + 1}/${retries}):`,
          error.response?.status || error.message);

        if (!isLastAttempt || !isLastEndpoint) {
          const delay = Math.min(1000 * Math.pow(2, i), 10000);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
      }
    }
  }

  console.warn('[PumpPortal] Using fallback SOL price after all attempts failed');
  return 100;
};

export function initializePumpPortalWebSocket() {
  if (typeof window === 'undefined') return;

  const cleanup = () => {
    if (ws) {
      try {
        ws.close();
      } catch (e) {
        console.error('[PumpPortal] Error closing WebSocket:', e);
      }
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
  };

  cleanup();

  const store = usePumpPortalStore.getState();

  // Initialize SOL price updates
  fetchSolanaPrice()
    .then(price => {
      store.setSolPrice(price);
      solPriceInterval = setInterval(async () => {
        try {
          const price = await fetchSolanaPrice();
          store.setSolPrice(price);
        } catch (error) {
          console.error('[PumpPortal] Failed to update SOL price:', error);
        }
      }, SOL_PRICE_UPDATE_INTERVAL);
    })
    .catch(console.error);

  try {
    console.log('[PumpPortal] Initializing WebSocket...');
    ws = new WebSocket(WS_URL);

    ws.onopen = () => {
      console.log('[PumpPortal] WebSocket connected');
      store.setConnected(true);
      reconnectAttempts = 0;
    };

    ws.onmessage = async (event) => {
      try {
        const { type, data } = JSON.parse(event.data);

        switch (type) {
          case 'newToken':
            try {
              const token = mapPumpPortalData(data);
              store.addToken(token);

              if (token.imageLink) {
                preloadTokenImages([{
                  imageLink: token.imageLink,
                  symbol: token.symbol
                }]);
              }
              // Subscribe to trades for the new token
              ws?.send(JSON.stringify({
                method: "subscribeTokenTrade",
                keys: [token.address]
              }));
            } catch (err) {
              console.error('[PumpPortal] Failed to process token:', err);
            }
            break;

          case 'trade':
            store.addTradeToHistory(data.mint, data);
            break;

          default:
            console.warn('[PumpPortal] Unknown message type:', type);
        }
      } catch (error) {
        console.error('[PumpPortal] Failed to parse message:', error, event.data);
      }
    };

    ws.onclose = (event) => {
      console.log('[PumpPortal] WebSocket disconnected', event);
      store.setConnected(false);
      cleanup();

      if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttempts++;
        console.log(`[PumpPortal] Attempting reconnect ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}`);
        reconnectTimeout = setTimeout(initializePumpPortalWebSocket,
          RECONNECT_DELAY * Math.pow(1.5, reconnectAttempts));
      }
    };

    ws.onerror = (error) => {
      console.error('[PumpPortal] WebSocket error:', error);
      store.setConnected(false);
    };

    // Cleanup on page unload
    window.addEventListener('beforeunload', cleanup);

  } catch (error) {
    console.error('[PumpPortal] Failed to initialize WebSocket:', error);
    store.setConnected(false);

    if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
      reconnectAttempts++;
      reconnectTimeout = setTimeout(initializePumpPortalWebSocket,
        RECONNECT_DELAY * Math.pow(1.5, reconnectAttempts));
    }
  }
}

// Initialize WebSocket connection
initializePumpPortalWebSocket();
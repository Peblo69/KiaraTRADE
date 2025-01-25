import { create } from 'zustand';
import { preloadTokenImages } from './token-metadata';
import axios from 'axios';

// Constants
const TOTAL_SUPPLY = 1_000_000_000;
const SOL_PRICE_UPDATE_INTERVAL = 10000;
const MAX_TRADES_PER_TOKEN = 100;
const WS_URL = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`;
const RECONNECT_DELAY = 5000;
const MAX_RECONNECT_ATTEMPTS = 5;

export interface TokenTrade {
  signature: string;
  timestamp: number;
  price: number;
  priceUsd: number;
  amount: number;
  type: 'buy' | 'sell';
  buyer: string;
  seller: string;
}

export interface PumpPortalToken {
  symbol: string;
  name: string;
  address: string;
  price: number;
  priceUsd: number;
  marketCap: number;
  liquidity: number;
  volume: number;
  volume24h: number;
  trades: number;
  trades24h: number;
  buys24h: number;
  sells24h: number;
  walletCount: number;
  recentTrades: TokenTrade[];
  imageLink?: string;
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
    const tradeAmount = Number(trade.solAmount || 0);
    const isBuy = trade.txType === 'buy';

    // Calculate price using bonding curve data
    const vTokens = Number(trade.vTokensInBondingCurve || 0);
    const vSol = Number(trade.vSolInBondingCurve || 0);
    const marketCapSol = Number(trade.marketCapSol || 0);

    // Price per token in SOL
    const tokenPrice = vTokens > 0 ? vSol / vTokens : 0;
    const tokenPriceUsd = tokenPrice * state.solPrice;
    const marketCapUsd = marketCapSol * state.solPrice;

    console.log('[Trade]', {
      type: isBuy ? 'buy' : 'sell',
      price: tokenPrice,
      priceUsd: tokenPriceUsd,
      amount: tradeAmount,
      volume: tradeAmount * state.solPrice,
      solPrice: state.solPrice,
      tokenAmount: trade.tokenAmount,
      vTokens,
      vSol,
      marketCapSol,
      marketCapUsd
    });

    const newTrade: TokenTrade = {
      signature: trade.signature,
      timestamp: now,
      price: tokenPrice,
      priceUsd: tokenPriceUsd,
      amount: tradeAmount,
      type: isBuy ? 'buy' : 'sell',
      buyer: isBuy ? trade.traderPublicKey : trade.counterpartyPublicKey,
      seller: isBuy ? trade.counterpartyPublicKey : trade.traderPublicKey
    };

    const recentTrades = [newTrade, ...(token.recentTrades || [])].slice(0, MAX_TRADES_PER_TOKEN);
    const last24h = now - 24 * 60 * 60 * 1000;
    const trades24h = recentTrades.filter(t => t.timestamp > last24h);

    set((state) => ({
      tokens: state.tokens.map(t =>
        t.address === address ? {
          ...t,
          price: tokenPrice,
          priceUsd: tokenPriceUsd,
          marketCap: marketCapUsd,
          liquidity: vSol * state.solPrice,
          volume: t.volume + (tradeAmount * state.solPrice),
          volume24h: trades24h.reduce((sum, t) => sum + (t.amount * t.priceUsd), 0),
          trades: t.trades + 1,
          trades24h: trades24h.length,
          buys24h: trades24h.filter(t => t.type === 'buy').length,
          sells24h: trades24h.filter(t => t.type === 'sell').length,
          recentTrades,
          walletCount: new Set([...recentTrades.map(t => t.buyer), ...recentTrades.map(t => t.seller)]).size
        } : t
      )
    }));
  },
  setConnected: (connected) => set({ isConnected: connected }),
  setSolPrice: (price) => {
    if (price > 0) {
      console.log('[PumpPortal] Updated SOL price:', price);
      set({ solPrice: price });
    }
  },
}));

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
        const isLastEndpoint = endpoint === API_ENDPOINTS[0];

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

  try {
    console.log('[PumpPortal] Initializing WebSocket...');
    ws = new WebSocket(WS_URL);
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

    ws.onopen = () => {
      console.log('[PumpPortal] WebSocket connected');
      store.setConnected(true);
      reconnectAttempts = 0;
    };

    ws.onmessage = async (event) => {
      try {
        const { type, data } = JSON.parse(event.data);
        console.log('[PumpPortal] Received message:', type, data);

        switch (type) {
          case 'newToken': {
            const token = mapPumpPortalData(data);
            store.addToken(token);
            if (token.imageLink) {
              preloadTokenImages([{
                imageLink: token.imageLink,
                symbol: token.symbol
              }]);
            }
            ws?.send(JSON.stringify({
              method: "subscribeTokenTrade",
              keys: [token.address]
            }));
            break;
          }

          case 'trade':
            store.addTradeToHistory(data.mint, data);
            break;

          default:
            console.warn('[PumpPortal] Unknown message type:', type);
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
    const store = usePumpPortalStore.getState();
    store.setConnected(false);

    if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
      reconnectAttempts++;
      reconnectTimeout = setTimeout(initializePumpPortalWebSocket,
        RECONNECT_DELAY * Math.pow(1.5, reconnectAttempts));
    }
  }
}

export function mapPumpPortalData(data: any): PumpPortalToken {
  const {
    mint,
    vSolInBondingCurve,
    marketCapSol,
    name,
    symbol,
    solAmount,
    traderPublicKey,
    imageLink,
  } = data;

  const solPrice = usePumpPortalStore.getState().solPrice || 0;
  //Corrected Price Calculation
  const priceSol = vSolInBondingCurve > 0 ? Number(vSolInBondingCurve) / Number(data.vTokensInBondingCurve) : 0;
  const priceUsd = priceSol * solPrice;
  const marketCapUsd = Number(marketCapSol || 0) * solPrice;
  const liquidityUsd = Number(vSolInBondingCurve || 0) * solPrice;
  const volumeUsd = Number(solAmount || 0) * solPrice;

  console.log('[Token Data]', {
    symbol,
    priceSol,
    priceUsd,
    marketCapUsd,
    liquidityUsd,
    volumeUsd
  });

  const now = Date.now();
  return {
    symbol: symbol || mint?.slice(0, 6) || 'Unknown',
    name: name || `Token ${mint?.slice(0, 8)}`,
    address: mint || '',
    price: priceSol,
    priceUsd: priceUsd,
    marketCap: marketCapUsd,
    liquidity: liquidityUsd,
    volume: volumeUsd,
    volume24h: volumeUsd,
    trades: 1,
    trades24h: 1,
    buys24h: 1,
    sells24h: 0,
    walletCount: 1,
    recentTrades: [{
      signature: '',
      timestamp: now,
      price: priceSol,
      priceUsd: priceUsd,
      amount: Number(solAmount || 0),
      type: 'buy',
      buyer: traderPublicKey,
      seller: ''
    }],
    imageLink: imageLink || 'https://via.placeholder.com/150',
  };
}

// Initialize WebSocket connection
initializePumpPortalWebSocket();
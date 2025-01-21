import { create } from "zustand";
import axios from "axios";

// -----------------------------------
// TYPES
// -----------------------------------
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
  priceHistory: {
    [timeframe: string]: {
      timestamp: number;
      price: number;
      volume: number;
    }[];
  };
  recentTrades: {
    timestamp: number;
    price: number;
    volume: number;
    isBuy: boolean;
    wallet: string;
  }[];
  status: {
    mad: boolean;
    fad: false;
    lb: boolean;
    tri: boolean;
  };
}

interface PumpPortalStore {
  tokens: PumpPortalToken[];
  isConnected: boolean;
  solPrice: number | null;
  addToken: (token: PumpPortalToken) => void;
  updateToken: (address: string, updates: Partial<PumpPortalToken>) => void;
  addTradeToHistory: (address: string, trade: any) => void;
  setConnected: (connected: boolean) => void;
  setSolPrice: (price: number) => void;
}

// -----------------------------------
// CONSTANTS
// -----------------------------------
const TOTAL_SUPPLY = 1_000_000_000;
const COINGECKO_API = "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd";
const HELIUS_API_URL = "https://mainnet.helius-rpc.com/v0";
const CACHE_DURATION = 30000;
const TIMEFRAMES = ['5m', '1h', '4h', '24h'];

// Cache mechanism for SOL price
let cachedSolPrice: number | null = null;
let lastPriceUpdate = 0;

async function fetchSolPrice(): Promise<number> {
  const now = Date.now();
  if (cachedSolPrice && (now - lastPriceUpdate < CACHE_DURATION)) {
    return cachedSolPrice;
  }

  try {
    const response = await axios.get(COINGECKO_API);
    const price = response.data?.solana?.usd;
    if (price) {
      cachedSolPrice = price;
      lastPriceUpdate = now;
      console.log('[PumpPortal] Updated SOL price:', price);
      return price;
    }
  } catch (error) {
    console.error('[PumpPortal] Error fetching SOL price:', error);
  }
  return cachedSolPrice || 100;
}

// -----------------------------------
// STORE
// -----------------------------------
export const usePumpPortalStore = create<PumpPortalStore>((set, get) => ({
  tokens: [],
  isConnected: false,
  solPrice: null,
  addToken: (token) =>
    set((state) => ({
      tokens: [token, ...state.tokens].slice(0, 10),
    })),
  updateToken: (address, updates) =>
    set((state) => ({
      tokens: state.tokens.map((token) =>
        token.address === address ? { ...token, ...updates } : token
      ),
    })),
  addTradeToHistory: (address, trade) =>
    set((state) => {
      const token = state.tokens.find(t => t.address === address);
      if (!token) return state;

      const now = Date.now();
      const solPrice = get().solPrice || 100;
      const tradeVolume = Number(trade.solAmount || 0) * solPrice;
      const isBuy = trade.txType === 'buy';

      // Update price history for each timeframe
      const updatedPriceHistory = { ...token.priceHistory };
      TIMEFRAMES.forEach(timeframe => {
        const history = updatedPriceHistory[timeframe] || [];
        history.push({
          timestamp: now,
          price: token.price,
          volume: tradeVolume
        });

        // Keep last 100 data points per timeframe
        if (history.length > 100) {
          history.shift();
        }
        updatedPriceHistory[timeframe] = history;
      });

      // Update recent trades
      const newTrade = {
        timestamp: now,
        price: token.price,
        volume: tradeVolume,
        isBuy,
        wallet: trade.traderPublicKey
      };

      const recentTrades = [newTrade, ...(token.recentTrades || [])].slice(0, 50);

      // Calculate 24h stats
      const last24h = now - 24 * 60 * 60 * 1000;
      const trades24h = recentTrades.filter(t => t.timestamp > last24h);
      const volume24h = trades24h.reduce((sum, t) => sum + t.volume, 0);
      const buys24h = trades24h.filter(t => t.isBuy).length;
      const sells24h = trades24h.filter(t => !t.isBuy).length;

      // Update token with new data
      return {
        tokens: state.tokens.map(t => 
          t.address === address ? {
            ...t,
            volume: t.volume + tradeVolume,
            volume24h,
            trades: t.trades + 1,
            trades24h: trades24h.length,
            buys24h,
            sells24h,
            priceHistory: updatedPriceHistory,
            recentTrades,
            walletCount: new Set([...recentTrades.map(trade => trade.wallet)]).size
          } : t
        )
      };
    }),
  setConnected: (connected) => set({ isConnected: connected }),
  setSolPrice: (price) => set({ solPrice: price }),
}));

async function mapPumpPortalData(data: any): Promise<PumpPortalToken> {
  try {
    console.log('[PumpPortal] Raw data received:', data);
    const solPrice = await fetchSolPrice();

    const {
      mint,
      vSolInBondingCurve,
      marketCapSol,
      bondingCurveKey,
      name,
      symbol,
      solAmount,
      traderPublicKey,
      uri,
      txType
    } = data;

    const marketCapUsd = Number(marketCapSol || 0) * solPrice;
    const priceUsd = marketCapUsd / TOTAL_SUPPLY;
    const liquidityUsd = Number(vSolInBondingCurve || 0) * solPrice;
    const volumeUsd = Number(solAmount || 0) * solPrice;

    const token: PumpPortalToken = {
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
      buys24h: txType === 'buy' ? 1 : 0,
      sells24h: txType === 'sell' ? 1 : 0,
      walletCount: 1,
      timestamp: Date.now(),
      priceHistory: {},
      recentTrades: [{
        timestamp: Date.now(),
        price: priceUsd,
        volume: volumeUsd,
        isBuy: txType === 'buy',
        wallet: traderPublicKey
      }],
      status: {
        mad: false,
        fad: false,
        lb: Boolean(bondingCurveKey),
        tri: false
      }
    };

    console.log('[PumpPortal] Mapped token:', token);
    usePumpPortalStore.getState().setSolPrice(solPrice);
    return token;
  } catch (error) {
    console.error('[PumpPortal] Error mapping data:', error);
    throw error;
  }
}

let ws: WebSocket | null = null;
let reconnectTimeout: NodeJS.Timeout | null = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY = 5000;

export function initializePumpPortalWebSocket() {
  if (typeof window === 'undefined') return;

  const store = usePumpPortalStore.getState();

  if (ws) {
    try {
      ws.close();
    } catch (e) {
      console.error('[PumpPortal] Error closing WebSocket:', e);
    }
    ws = null;
  }

  try {
    console.log('[PumpPortal] Initializing WebSocket...');
    ws = new WebSocket('wss://pumpportal.fun/api/data');

    ws.onopen = () => {
      console.log('[PumpPortal] WebSocket connected.');
      store.setConnected(true);
      reconnectAttempts = 0;

      if (ws?.readyState === WebSocket.OPEN) {
        // Subscribe to new token events
        ws.send(JSON.stringify({
          method: "subscribeNewToken"
        }));
        console.log('[PumpPortal] Subscribed to new token events');

        // Subscribe to trade events for all tokens
        ws.send(JSON.stringify({
          method: "subscribeTokenTrade"
        }));
        console.log('[PumpPortal] Subscribed to token trade events');
      }
    };

    ws.onmessage = async (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('[PumpPortal] Received event:', data);

        if (data.message?.includes('Successfully subscribed')) {
          return;
        }

        // Handle new token creation
        if (data.txType === 'create' && data.mint) {
          try {
            const token = await mapPumpPortalData(data);
            store.addToken(token);
            console.log('[PumpPortal] Added new token:', token.symbol);
          } catch (err) {
            console.error('[PumpPortal] Failed to process token:', err);
          }
        }

        // Handle trade events
        if (['buy', 'sell'].includes(data.txType) && data.mint) {
          store.addTradeToHistory(data.mint, data);
          console.log(`[PumpPortal] Added ${data.txType} trade for ${data.mint}`);
        }

      } catch (error) {
        console.error('[PumpPortal] Failed to parse message:', error);
      }
    };

    ws.onclose = () => {
      console.log('[PumpPortal] WebSocket disconnected');
      store.setConnected(false);

      if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttempts++;
        console.log(`[PumpPortal] Attempting reconnect ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}`);
        reconnectTimeout = setTimeout(initializePumpPortalWebSocket, RECONNECT_DELAY);
      }
    };

    ws.onerror = (error) => {
      console.error('[PumpPortal] WebSocket error:', error);
      store.setConnected(false);
    };

  } catch (error) {
    console.error('[PumpPortal] Failed to initialize WebSocket:', error);
    store.setConnected(false);

    if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
      reconnectAttempts++;
      console.log(`[PumpPortal] Attempting reconnect ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}`);
      reconnectTimeout = setTimeout(initializePumpPortalWebSocket, RECONNECT_DELAY);
    }
  }
}

initializePumpPortalWebSocket();
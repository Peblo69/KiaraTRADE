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
  signature: string;
  timestamp: number;
  price: number;    // fill price in SOL
  priceUsd: number; // fill price in USD 
  amount: number;   // total SOL exchanged
  type: 'buy' | 'sell';
  buyer: string;
  seller: string;
}

export interface PumpFunToken {
  symbol: string;
  name: string;
  address: string;

  // Real-time "current price" (from last trade fill or bonding curve)
  price: number;    // in SOL
  priceUsd: number; // in USD

  marketCap: number; // in USD
  liquidity: number; // in USD

  volume: number;    // total volume in USD so far
  volume24h: number; // last 24h volume in USD

  trades: number;
  trades24h: number;
  buys24h: number;
  sells24h: number;
  walletCount: number;

  recentTrades: TokenTrade[];
  imageLink?: string;
}

interface PumpFunStore {
  tokens: Record<string, PumpFunToken>;
  solPrice: number;
  isConnected: boolean;

  setConnected: (v: boolean) => void;
  setSolPrice: (price: number) => void;

  handleNewToken: (data: any) => void;
  handleTrade: (data: any) => void;
}

export const usePumpFunStore = create<PumpFunStore>((set, get) => ({
  tokens: {},
  solPrice: 0,
  isConnected: false,

  setConnected: (v) => set({ isConnected: v }),

  setSolPrice: (price) => {
    if (price > 0) {
      console.log('[PumpPortal] Updated SOL price:', price);
      set({ solPrice: price });
    }
  },

  handleNewToken: (data) => {
    const { mint, symbol, name, imageLink, solAmount, marketCapSol, vSolInBondingCurve, vTokensInBondingCurve } = data;
    const store = get();
    const solPrice = store.solPrice;

    const rawVSol = Number(vSolInBondingCurve || 0);
    const rawVTokens = Number(vTokensInBondingCurve || 0);

    // "bonding curve" ratio
    const priceSol = rawVTokens > 0 ? rawVSol / rawVTokens : 0;
    const priceUsd = priceSol * solPrice;

    // Market cap and liquidity
    const mcSol = Number(marketCapSol || 0);
    const marketCapUsd = mcSol * solPrice;
    const liquidityUsd = rawVSol * solPrice;
    const volumeUsd = (Number(solAmount) || 0) * solPrice;

    const tokenObj: PumpFunToken = {
      symbol: symbol || 'TKN',
      name: name || `Token ${mint?.slice(0,6)}`,
      address: mint || '',

      price: priceSol,
      priceUsd: priceUsd,
      marketCap: marketCapUsd,
      liquidity: liquidityUsd,

      volume: volumeUsd,
      volume24h: volumeUsd,

      trades: 0,
      trades24h: 0,
      buys24h: 0,
      sells24h: 0,
      walletCount: 0,

      recentTrades: [],
      imageLink: imageLink || 'https://via.placeholder.com/150',
    };

    set((st) => ({
      tokens: {
        ...st.tokens,
        [tokenObj.address]: tokenObj,
      },
    }));
  },

  handleTrade: (data) => {
    const store = get();
    const token = store.tokens[data.mint];
    if (!token || !store.solPrice) return;

    const now = Date.now();
    const solAmount = Number(data.solAmount || 0);
    const rawTokenAmount = Number(data.tokenAmount || 0);
    const isBuy = data.txType === 'buy';

    // Calculate fill price
    let fillPriceSol = 0;
    if (rawTokenAmount > 0) {
      fillPriceSol = solAmount / rawTokenAmount;
    }
    const fillPriceUsd = fillPriceSol * store.solPrice;

    // Get bonding curve data
    const vSol = Number(data.vSolInBondingCurve || 0);
    const vTokens = Number(data.vTokensInBondingCurve || 0);
    const bcPriceSol = vTokens > 0 ? vSol / vTokens : 0;

    // Calculate market cap and liquidity
    const mcSol = Number(data.marketCapSol || 0);
    const mcUsd = mcSol * store.solPrice;
    const liquidityUsd = vSol * store.solPrice;
    const tradeVolumeUsd = solAmount * store.solPrice;

    // Build trade record
    const buyer = isBuy ? data.traderPublicKey : data.counterpartyPublicKey;
    const seller = isBuy ? data.counterpartyPublicKey : data.traderPublicKey;
    const newTrade: TokenTrade = {
      signature: data.signature,
      timestamp: now,
      price: fillPriceSol,
      priceUsd: fillPriceUsd,
      amount: solAmount,
      type: isBuy ? 'buy' : 'sell',
      buyer,
      seller,
    };

    // Update recent trades and stats
    const oldTrades = token.recentTrades || [];
    const recentTrades = [newTrade, ...oldTrades].slice(0, MAX_TRADES_PER_TOKEN);
    const cutoff = now - 24 * 3600_000;
    const trades24h = recentTrades.filter((t) => t.timestamp > cutoff);
    const volume24hUsd = trades24h.reduce((sum, t) => sum + t.amount * store.solPrice, 0);
    const newVolumeUsd = token.volume + tradeVolumeUsd;

    set((st) => {
      const oldToken = st.tokens[data.mint];
      if (!oldToken) return {};

      return {
        tokens: {
          ...st.tokens,
          [data.mint]: {
            ...oldToken,
            price: fillPriceSol,
            priceUsd: fillPriceUsd,
            marketCap: mcUsd,
            liquidity: liquidityUsd,
            volume: newVolumeUsd,
            volume24h: volume24hUsd,

            trades: oldToken.trades + 1,
            trades24h: trades24h.length,
            buys24h: trades24h.filter((x) => x.type === 'buy').length,
            sells24h: trades24h.filter((x) => x.type === 'sell').length,

            recentTrades,
            walletCount: new Set(recentTrades.flatMap((x) => [x.buyer, x.seller])).size,
          },
        },
      };
    });

    console.log('[Trade Debug]', {
      solAmount,
      rawTokenAmount,
      fillPriceSol,
      fillPriceUsd,
      bcPriceSol,
      liquidityUsd,
      mcUsd,
      tradeVolumeUsd,
    });
  },
}));

// WebSocket Connection Management
let ws: WebSocket | null = null;
let reconnectAttempts = 0;
let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
let solPriceInterval: ReturnType<typeof setInterval> | null = null;

const fetchSolanaPrice = async (): Promise<number> => {
  try {
    const resp = await axios.get('https://api.binance.com/api/v3/ticker/price?symbol=SOLUSDT');
    const price = Number(resp.data.price);
    if (!isNaN(price) && price > 0) return price;
    return 100; // fallback
  } catch {
    return 100;
  }
};

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

export function initializePumpPortalWebSocket() {
  cleanup();

  try {
    console.log('[PumpPortal] Initializing WebSocket...');
    ws = new WebSocket(WS_URL);
    const store = usePumpFunStore.getState();

    ws.onopen = () => {
      console.log('[PumpPortal] WebSocket connected');
      store.setConnected(true);
      reconnectAttempts = 0;

      // Start SOL price updates
      fetchSolanaPrice().then((p) => store.setSolPrice(p));
      solPriceInterval = setInterval(async () => {
        const p = await fetchSolanaPrice();
        store.setSolPrice(p);
      }, SOL_PRICE_UPDATE_INTERVAL);
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        const { type, data } = msg;
        if (type === 'newToken') {
          store.handleNewToken(data);
        } else if (type === 'trade') {
          store.handleTrade(data);
        } else {
          console.warn('[PumpPortal] Unknown message type:', type);
        }
      } catch (err) {
        console.error('[PumpPortal] Parse error:', err);
      }
    };

    ws.onclose = () => {
      console.log('[PumpPortal] WebSocket disconnected');
      store.setConnected(false);
      cleanup();

      if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttempts++;
        const delay = RECONNECT_DELAY * Math.pow(1.5, reconnectAttempts);
        console.log(`[PumpPortal] Reconnect attempt ${reconnectAttempts} in ${delay}ms`);
        reconnectTimeout = setTimeout(initializePumpPortalWebSocket, delay);
      }
    };

    ws.onerror = (err) => {
      console.error('[PumpPortal] WebSocket error:', err);
      store.setConnected(false);
    };

  } catch (err) {
    console.error('[PumpPortal] Failed to init ws:', err);
  }
}

// Initialize on load
initializePumpPortalWebSocket();
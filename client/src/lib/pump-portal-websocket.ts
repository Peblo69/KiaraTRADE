// FILE: /src/lib/pump-portal-websocket.ts

import { create } from "zustand";
import axios from "axios";
import { useHeliusStore } from './helius-websocket';
import { preloadTokenImages } from './token-metadata';

// -----------------------------------
// TYPES
// -----------------------------------
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
  previousPrice: number;
  marketCap: number;
  previousMarketCap: number;
  liquidity: number;
  previousLiquidity: number;
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
  timeWindows: {
    '1s': TimeWindowStats;
    '5s': TimeWindowStats;
    '15s': TimeWindowStats;
    '30s': TimeWindowStats;
    '1m': TimeWindowStats;
    '5m': TimeWindowStats;
    '15m': TimeWindowStats;
    '30m': TimeWindowStats;
    '1h': TimeWindowStats;
    '4h': TimeWindowStats;
    '12h': TimeWindowStats;
    '24h': TimeWindowStats;
  };
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
    fad: boolean;
    lb: boolean;
    tri: boolean;
  };
  imageLink?: string;
}

// Constants
const TOTAL_SUPPLY = 1_000_000_000;
const COINGECKO_API = "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd";
const CACHE_DURATION = 30000;
const PRICE_IMPACT_FACTOR = 0.00001;

const TIME_WINDOWS = {
  '1s': 1000,
  '5s': 5000,
  '15s': 15000,
  '30s': 30000,
  '1m': 60000,
  '5m': 300000,
  '15m': 900000,
  '30m': 1800000,
  '1h': 3600000,
  '4h': 14400000,
  '12h': 43200000,
  '24h': 86400000,
} as const;

let cachedSolPrice: number | null = null;
let lastPriceUpdate = 0;

function createEmptyTimeWindow(startTime: number): TimeWindowStats {
  return {
    startTime,
    endTime: startTime + 1000,
    openPrice: 0,
    closePrice: 0,
    highPrice: 0,
    lowPrice: Infinity,
    volume: 0,
    trades: 0,
    buys: 0,
    sells: 0,
  };
}

function createEmptyTimeWindows(timestamp: number) {
  const windows: any = {};
  Object.keys(TIME_WINDOWS).forEach(window => {
    windows[window] = createEmptyTimeWindow(timestamp);
  });
  return windows;
}

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
      return price;
    }
  } catch (error) {
    console.error('[PumpPortal] SOL price fetch failed');
  }
  return cachedSolPrice || 100;
}

function calculatePriceImpact(token: PumpPortalToken, tradeVolume: number, isBuy: boolean): number {
  const liquidityUsd = token.liquidity;
  const impact = (tradeVolume / liquidityUsd) * PRICE_IMPACT_FACTOR;
  return isBuy ? token.price * (1 + impact) : token.price * (1 - impact);
}

// -----------------------------------
// STORE
// -----------------------------------
export const usePumpPortalStore = create<PumpPortalStore>((set, get) => ({
  tokens: [],
  isConnected: false,
  solPrice: null,

  addToken: async (token: PumpPortalToken) => {
    const imageUrl = await getTokenImage(token);
    token.imageLink = imageUrl;

    set((state) => ({
      tokens: [token, ...state.tokens].slice(0, 10),
    }));
  },

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
      const solPrice = state.solPrice || 100;
      const tradeVolume = Number(trade.solAmount || 0) * solPrice;
      const isBuy = trade.txType === 'buy';

      const previousPrice = token.price;
      const previousMarketCap = token.marketCap;
      const previousLiquidity = token.liquidity;

      const newPrice = calculatePriceImpact(token, tradeVolume, isBuy);

      // Update time windows
      const updatedWindows = { ...token.timeWindows };
      Object.entries(TIME_WINDOWS).forEach(([window, duration]) => {
        const currentWindow = updatedWindows[window as keyof typeof TIME_WINDOWS];
        const windowStart = Math.floor(now / duration) * duration;

        const priceChange = Math.abs((newPrice - currentWindow.closePrice) / currentWindow.closePrice);
        const shouldResetWindow = now > currentWindow.endTime || priceChange > 0.05;

        if (shouldResetWindow) {
          updatedWindows[window as keyof typeof TIME_WINDOWS] = {
            startTime: windowStart,
            endTime: windowStart + duration,
            openPrice: newPrice,
            closePrice: newPrice,
            highPrice: newPrice,
            lowPrice: newPrice,
            volume: tradeVolume,
            trades: 1,
            buys: isBuy ? 1 : 0,
            sells: isBuy ? 0 : 1,
          };
        } else {
          currentWindow.closePrice = newPrice;
          currentWindow.highPrice = Math.max(currentWindow.highPrice, newPrice);
          currentWindow.lowPrice = Math.min(currentWindow.lowPrice, newPrice);
          currentWindow.volume += tradeVolume;
          currentWindow.trades += 1;
          if (isBuy) currentWindow.buys += 1;
          else currentWindow.sells += 1;
        }
      });

      const newTrade = {
        timestamp: now,
        price: newPrice,
        volume: tradeVolume,
        isBuy,
        wallet: trade.traderPublicKey
      };

      const recentTrades = [newTrade, ...(token.recentTrades || [])];

      const last24h = now - 24 * 60 * 60 * 1000;
      const trades24h = recentTrades.filter(t => t.timestamp > last24h);
      const volume24h = trades24h.reduce((sum, t) => sum + t.volume, 0);
      const buys24h = trades24h.filter(t => t.isBuy).length;
      const sells24h = trades24h.filter(t => !t.isBuy).length;

      const newMarketCap = newPrice * TOTAL_SUPPLY;
      const newLiquidity = token.liquidity + (isBuy ? tradeVolume : -tradeVolume);
      const liquidityChange = ((newLiquidity - token.liquidity) / token.liquidity) * 100;

      return {
        tokens: state.tokens.map(t =>
          t.address === address ? {
            ...t,
            previousPrice,
            previousMarketCap,
            previousLiquidity,
            price: newPrice,
            marketCap: newMarketCap,
            liquidity: newLiquidity,
            liquidityChange,
            volume: t.volume + tradeVolume,
            volume24h,
            trades: t.trades + 1,
            trades24h: trades24h.length,
            buys24h,
            sells24h,
            timeWindows: updatedWindows,
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
      txType,
      imageLink
    } = data;

    const marketCapUsd = Number(marketCapSol || 0) * solPrice;
    const priceUsd = marketCapUsd / TOTAL_SUPPLY;
    const liquidityUsd = Number(vSolInBondingCurve || 0) * solPrice;
    const volumeUsd = Number(solAmount || 0) * solPrice;

    const now = Date.now();
    const token: PumpPortalToken = {
      symbol: symbol || mint?.slice(0, 6) || 'Unknown',
      name: name || `Token ${mint?.slice(0, 8)}`,
      address: mint || '',
      price: priceUsd,
      previousPrice: priceUsd,
      marketCap: marketCapUsd,
      previousMarketCap: marketCapUsd,
      liquidity: liquidityUsd,
      previousLiquidity: liquidityUsd,
      liquidityChange: 0,
      l1Liquidity: liquidityUsd,
      volume: volumeUsd,
      volume24h: volumeUsd,
      trades: 1,
      trades24h: 1,
      buys24h: txType === 'buy' ? 1 : 0,
      sells24h: txType === 'sell' ? 1 : 0,
      walletCount: 1,
      timestamp: now,
      timeWindows: createEmptyTimeWindows(now),
      priceHistory: {},
      recentTrades: [{
        timestamp: now,
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
      },
      imageLink: imageLink || 'https://via.placeholder.com/150',
    };

    usePumpPortalStore.getState().setSolPrice(solPrice);
    return token;
  } catch (error) {
    console.error('[PumpPortal] Error mapping token data');
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
      console.error('[PumpPortal] Error closing WebSocket');
    }
    ws = null;
  }

  try {
    ws = new WebSocket('wss://pumpportal.fun/api/data');

    ws.onopen = () => {
      store.setConnected(true);
      reconnectAttempts = 0;

      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          method: "subscribeNewToken",
          keys: []
        }));

        const existingTokenAddresses = usePumpPortalStore.getState().tokens.map(t => t.address);
        if (existingTokenAddresses.length > 0) {
          ws.send(JSON.stringify({
            method: "subscribeTokenTrade",
            keys: existingTokenAddresses
          }));
        }
      }
    };

    ws.onmessage = async (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.message?.includes('Successfully subscribed')) {
          return;
        }

        if (data.errors) {
          console.error('[PumpPortal] WebSocket error:', data.errors);
          return;
        }

        if (data.txType === 'create' && data.mint) {
          try {
            const token = await mapPumpPortalData(data);
            await store.addToken(token);
            useHeliusStore.getState().subscribeToToken(data.mint);

            await preloadTokenImages([{
              imageLink: token.imageLink,
              symbol: token.symbol
            }]);

            ws?.send(JSON.stringify({
              method: "subscribeTokenTrade",
              keys: [token.address]
            }));
          } catch (err) {
            console.error('[PumpPortal] Token processing error');
          }
        }

        if (['buy', 'sell'].includes(data.txType) && data.mint) {
          store.addTradeToHistory(data.mint, data);
        }

      } catch (error) {
        console.error('[PumpPortal] Message parsing error');
      }
    };

    ws.onclose = () => {
      store.setConnected(false);

      if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttempts++;
        reconnectTimeout = setTimeout(initializePumpPortalWebSocket, RECONNECT_DELAY);
      }
    };

    ws.onerror = (error) => {
      console.error('[PumpPortal] WebSocket error');
      store.setConnected(false);
    };

  } catch (error) {
    console.error('[PumpPortal] WebSocket initialization error');
    store.setConnected(false);

    if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
      reconnectAttempts++;
      reconnectTimeout = setTimeout(initializePumpPortalWebSocket, RECONNECT_DELAY);
    }
  }
}

initializePumpPortalWebSocket();
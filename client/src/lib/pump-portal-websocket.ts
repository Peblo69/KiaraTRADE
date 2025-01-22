import { create } from "zustand";
import { useHeliusStore } from './helius-websocket';
import { preloadTokenImages } from './token-metadata';
import axios from 'axios';

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

// -----------------------------------
// CONSTANTS
// -----------------------------------
const TOTAL_SUPPLY = 1_000_000_000;
const SOL_PRICE_UPDATE_INTERVAL = 30000; // 30 seconds
const COINGECKO_API_URL = 'https://api.coingecko.com/api/v3';

let solPriceInterval: NodeJS.Timeout | null = null;

async function fetchSolanaPrice(): Promise<number> {
  try {
    const response = await axios.get(`${COINGECKO_API_URL}/simple/price`, {
      params: {
        ids: 'solana',
        vs_currencies: 'usd'
      }
    });

    const solPrice = response.data?.solana?.usd;
    if (!solPrice) {
      throw new Error('Invalid price response');
    }
    console.log('[PumpPortal] Updated SOL price:', solPrice);
    return solPrice;
  } catch (error) {
    console.error('[PumpPortal] Error fetching SOL price:', error);
    const currentPrice = usePumpPortalStore.getState().solPrice;
    if (currentPrice > 0) {
      console.log('[PumpPortal] Using cached SOL price:', currentPrice);
      return currentPrice;
    }
    throw error;
  }
}

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

function calculatePriceImpact(liquidity: number, tradeVolume: number, isBuy: boolean): number {
  const impact = (tradeVolume / liquidity) * 0.005; // 0.5% max impact per trade
  return isBuy ? (1 + impact) : (1 - impact);
}

// -----------------------------------
// STORE
// -----------------------------------
export const usePumpPortalStore = create<PumpPortalStore>((set, get) => ({
  tokens: [],
  isConnected: false,
  solPrice: 0,
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
      const solPrice = state.solPrice;
      if (!solPrice) {
        console.warn('[PumpPortal] No SOL price available for trade calculation');
        return state;
      }

      const tradeVolume = Number(trade.solAmount || 0) * solPrice;
      const isBuy = trade.txType === 'buy';

      // Calculate new price with increased impact
      const priceImpact = calculatePriceImpact(token.liquidity || 1, tradeVolume, isBuy);
      const newPrice = (token.price || 0) * priceImpact;

      // Update time windows with forced window reset on large changes
      const updatedWindows = { ...token.timeWindows };
      Object.entries(TIME_WINDOWS).forEach(([window, duration]) => {
        const currentWindow = updatedWindows[window as keyof typeof TIME_WINDOWS];
        const windowStart = Math.floor(now / duration) * duration;

        // Reset window if price change is significant or window expired
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

      // Update recent trades with new trade at the beginning
      const newTrade = {
        timestamp: now,
        price: newPrice,
        volume: tradeVolume,
        isBuy,
        wallet: trade.traderPublicKey
      };

      const recentTrades = [newTrade, ...(token.recentTrades || [])].slice(0, 1000);

      // Calculate 24h stats using the full trade history
      const last24h = now - 24 * 60 * 60 * 1000;
      const trades24h = recentTrades.filter(t => t.timestamp > last24h);
      const volume24h = trades24h.reduce((sum, t) => sum + t.volume, 0);
      const buys24h = trades24h.filter(t => t.isBuy).length;
      const sells24h = trades24h.filter(t => !t.isBuy).length;

      // Calculate new market cap and liquidity with higher sensitivity
      const newMarketCap = newPrice * TOTAL_SUPPLY;
      const newLiquidity = token.liquidity + (isBuy ? tradeVolume : -tradeVolume);
      const liquidityChange = ((newLiquidity - token.liquidity) / token.liquidity) * 100;

      return {
        tokens: state.tokens.map(t =>
          t.address === address ? {
            ...t,
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
  setSolPrice: (price) => {
    if (price > 0) {
      console.log('[PumpPortal] Setting SOL price:', price);
      set({ solPrice: price });
    } else {
      console.warn('[PumpPortal] Attempted to set invalid SOL price:', price);
    }
  },
}));

// Time windows in milliseconds
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
} as const;


async function mapPumpPortalData(data: any): Promise<PumpPortalToken> {
  try {
    console.log('[PumpPortal] Raw data received:', data);
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

    // Ensure we have a valid SOL price
    let solPrice = usePumpPortalStore.getState().solPrice;
    if (!solPrice) {
      solPrice = await fetchSolanaPrice();
      usePumpPortalStore.getState().setSolPrice(solPrice);
    }

    // Calculate USD values using current SOL price
    const marketCapUsd = Number(marketCapSol || 0) * solPrice;
    const liquidityUsd = Number(vSolInBondingCurve || 0) * solPrice;
    const volumeUsd = Number(solAmount || 0) * solPrice;

    // Calculate price per token with fallback
    const totalSupply = TOTAL_SUPPLY;
    const priceUsd = marketCapUsd / totalSupply || 0;

    const now = Date.now();
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
      buys24h: data.txType === 'buy' ? 1 : 0,
      sells24h: data.txType === 'sell' ? 1 : 0,
      walletCount: 1,
      timestamp: now,
      timeWindows: createEmptyTimeWindows(now),
      priceHistory: {},
      recentTrades: [{
        timestamp: now,
        price: priceUsd,
        volume: volumeUsd,
        isBuy: data.txType === 'buy',
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

    console.log('[PumpPortal] Mapped token:', {
      symbol: token.symbol,
      price: token.price,
      marketCap: token.marketCap,
      liquidity: token.liquidity
    });

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

  // Clear existing SOL price interval
  if (solPriceInterval) {
    clearInterval(solPriceInterval);
  }

  // Initialize SOL price updates
  fetchSolanaPrice()
    .then(price => {
      store.setSolPrice(price);

      // Start regular price updates
      solPriceInterval = setInterval(async () => {
        try {
          const price = await fetchSolanaPrice();
          store.setSolPrice(price);
        } catch (error) {
          console.error('[PumpPortal] Failed to update SOL price:', error);
        }
      }, SOL_PRICE_UPDATE_INTERVAL);
    })
    .catch(error => {
      console.error('[PumpPortal] Initial SOL price fetch failed:', error);
    });

  try {
    console.log('[PumpPortal] Initializing WebSocket...');
    ws = new WebSocket('wss://pumpportal.fun/api/data');

    ws.onopen = () => {
      console.log('[PumpPortal] WebSocket connected.');
      store.setConnected(true);
      reconnectAttempts = 0;

      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          method: "subscribeNewToken",
          keys: []
        }));
        console.log('[PumpPortal] Subscribed to new token events');

        const existingTokenAddresses = usePumpPortalStore.getState().tokens.map(t => t.address);
        if (existingTokenAddresses.length > 0) {
          ws.send(JSON.stringify({
            method: "subscribeTokenTrade",
            keys: existingTokenAddresses
          }));
          console.log('[PumpPortal] Subscribed to trade events for existing tokens');
        }
      }
    };

    ws.onmessage = async (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('[PumpPortal] Raw event data:', data);

        if (data.message?.includes('Successfully subscribed')) {
          return;
        }

        if (data.errors) {
          console.error('[PumpPortal] Error received:', data.errors);
          return;
        }

        if (data.txType === 'create' && data.mint) {
          try {
            const token = await mapPumpPortalData(data);
            store.addToken(token);
            useHeliusStore.getState().subscribeToToken(data.mint);
            console.log('[PumpPortal] Added new token:', {
              symbol: token.symbol,
              price: token.price,
              marketCap: token.marketCap,
              liquidity: token.liquidity
            });

            preloadTokenImages([{
              imageLink: token.imageLink,
              symbol: token.symbol
            }]);

            ws?.send(JSON.stringify({
              method: "subscribeTokenTrade",
              keys: [token.address]
            }));
            console.log(`[PumpPortal] Subscribed to trade events for token: ${token.symbol}`);
          } catch (err) {
            console.error('[PumpPortal] Failed to process token:', err);
          }
        }
        else if (['buy', 'sell'].includes(data.txType) && data.mint) {
          console.log('[PumpPortal] Processing trade:', {
            type: data.txType,
            mint: data.mint,
            solAmount: data.solAmount,
            trader: data.traderPublicKey,
            timestamp: new Date().toISOString()
          });
          store.addTradeToHistory(data.mint, data);
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

      // Clear price update interval on disconnect
      if (solPriceInterval) {
        clearInterval(solPriceInterval);
        solPriceInterval = null;
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
// FILE: /src/lib/pump-portal-websocket.ts

import { create } from "zustand";
import axios from "axios";
import { useHeliusStore } from './helius-websocket';
import { preloadTokenImages, getTokenImage } from './token-metadata';

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
  previousPrice: number; // New field for comparison
  marketCap: number;
  previousMarketCap: number; // New field for comparison
  liquidity: number;
  previousLiquidity: number; // New field for comparison
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
  imageLink?: string; // Updated to hold the actual image URL
}

interface PumpPortalStore {
  tokens: PumpPortalToken[];
  isConnected: boolean;
  solPrice: number | null;
  addToken: (token: PumpPortalToken) => Promise<void>;
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
const CACHE_DURATION = 30000;
const PRICE_IMPACT_FACTOR = 0.00001; // Adjust based on actual market behavior

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
  '4h': 14400000,
  '12h': 43200000,
  '24h': 86400000,
} as const;

// Cache mechanism for SOL price
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
      console.log('[PumpPortal] Updated SOL price:', price);
      return price;
    }
  } catch (error) {
    console.error('[PumpPortal] Error fetching SOL price:', error);
  }
  return cachedSolPrice || 100;
}

function calculatePriceImpact(token: PumpPortalToken, tradeVolume: number, isBuy: boolean): number {
  // Stronger price impact for more accurate price movements
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
    // Fetch and set the actual image URL
    const imageUrl = await getTokenImage(token);
    token.imageLink = imageUrl;

    set((state) => ({
      tokens: [token, ...state.tokens].slice(0, 10), // Keep only the latest 10 tokens
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

      // Store previous values before updating
      const previousPrice = token.price;
      const previousMarketCap = token.marketCap;
      const previousLiquidity = token.liquidity;

      // Calculate new price with increased impact
      const newPrice = calculatePriceImpact(token, tradeVolume, isBuy);

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

      // Update recent trades by appending without limit
      const newTrade = {
        timestamp: now, // Ensure this is a number
        price: newPrice,
        volume: tradeVolume,
        isBuy,
        wallet: trade.traderPublicKey
      };

      const recentTrades = [newTrade, ...(token.recentTrades || [])]; // No slicing

      // Calculate 24h stats
      const last24h = now - 24 * 60 * 60 * 1000;
      const trades24h = recentTrades.filter(t => t.timestamp > last24h);
      const volume24h = trades24h.reduce((sum, t) => sum + t.volume, 0);
      const buys24h = trades24h.filter(t => t.isBuy).length;
      const sells24h = trades24h.filter(t => !t.isBuy).length;

      // Calculate new market cap and liquidity with higher sensitivity
      const newMarketCap = newPrice * TOTAL_SUPPLY;
      const newLiquidity = token.liquidity + (isBuy ? tradeVolume : -tradeVolume);
      const liquidityChange = ((newLiquidity - token.liquidity) / token.liquidity) * 100;

      // Update token with new data and previous fields
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
            recentTrades, // No slicing, store all trades
            walletCount: new Set([...recentTrades.map(trade => trade.wallet)]).size
          } : t
        )
      };
    }),

  setConnected: (connected) => set({ isConnected: connected }),
  setSolPrice: (price) => set({ solPrice: price }),
}));

/**
 * Maps raw PumpPortal data to the PumpPortalToken structure.
 * @param data - Raw data received from PumpPortal.
 * @returns A Promise that resolves to a PumpPortalToken.
 */
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
      txType,
      imageLink // Ensure this field is present in your data
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
      previousPrice: priceUsd, // Initialize previousPrice
      marketCap: marketCapUsd,
      previousMarketCap: marketCapUsd, // Initialize previousMarketCap
      liquidity: liquidityUsd,
      previousLiquidity: liquidityUsd, // Initialize previousLiquidity
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
        timestamp: now, // Ensure this is a number
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
      imageLink: imageLink || 'https://via.placeholder.com/150', // Will be updated in addToken
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

/**
 * Initializes the PumpPortal WebSocket connection.
 * Handles subscription to new tokens and trade events.
 */
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
        // Subscribe to new token events with required 'keys' parameter
        ws.send(JSON.stringify({
          method: "subscribeNewToken",
          keys: [] // Adjust based on server requirements
        }));
        console.log('[PumpPortal] Subscribed to new token events');

        // Subscribe to trade events only for existing tokens
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

        // Handle errors
        if (data.errors) {
          console.error('[PumpPortal] Error received:', data.errors);
          return;
        }

        // Handle new token creation
        if (data.txType === 'create' && data.mint) {
          try {
            const token = await mapPumpPortalData(data);
            await store.addToken(token);
            // Subscribe to this token's address in Helius
            useHeliusStore.getState().subscribeToToken(data.mint);
            console.log('[PumpPortal] Added new token:', {
              symbol: token.symbol,
              price: token.price,
              marketCap: token.marketCap,
              liquidity: token.liquidity
            });

            // Preload token images
            await preloadTokenImages([{
              imageLink: token.imageLink, // Already updated in addToken
              symbol: token.symbol
            }]);

            // Subscribe to trade events for this new token
            ws?.send(JSON.stringify({
              method: "subscribeTokenTrade",
              keys: [token.address] // Subscribe to trade events for this token
            }));
            console.log(`[PumpPortal] Subscribed to trade events for token: ${token.symbol}`);
          } catch (err) {
            console.error('[PumpPortal] Failed to process token:', err);
          }
        }

        // Handle trade events
        if (['buy', 'sell'].includes(data.txType) && data.mint) {
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

// Initialize WebSocket connection
initializePumpPortalWebSocket();

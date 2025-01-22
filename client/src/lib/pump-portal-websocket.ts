import { create } from "zustand";
import axios from "axios";
import { useHeliusStore } from './helius-websocket';

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
  volume: number;
  volume24h: number;
  trades: number;
  trades24h: number;
  buys24h: number;
  sells24h: number;
  walletCount: number;
  timestamp: number;
  uri: string;  // Added URI field for metadata
  timeWindows: {
    [K in keyof typeof TIME_WINDOWS]: TimeWindowStats;
  };
  recentTrades: {
    timestamp: number;
    price: number;
    volume: number;
    isBuy: boolean;
    wallet: string;
  }[];
  isValid: boolean;
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
const CACHE_DURATION = 30000;

// Time windows in milliseconds
const TIME_WINDOWS = {
  '1m': 60000,
  '5m': 300000,
  '15m': 900000,
  '1h': 3600000,
  '4h': 14400000,
  '24h': 86400000,
} as const;

// Cache mechanism for SOL price
let cachedSolPrice: number | null = null;
let lastPriceUpdate = 0;

function createEmptyTimeWindow(startTime: number): TimeWindowStats {
  return {
    startTime,
    endTime: startTime + 60000, // Default to 1m window
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
  const windows: Record<keyof typeof TIME_WINDOWS, TimeWindowStats> = {} as any;
  Object.keys(TIME_WINDOWS).forEach(window => {
    windows[window as keyof typeof TIME_WINDOWS] = createEmptyTimeWindow(timestamp);
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

// -----------------------------------
// STORE
// -----------------------------------
// Add debug helper
function debugLog(source: string, message: string, data?: any) {
  console.log(`[PumpPortal:${source}]`, message, data ? data : '');
}

export const usePumpPortalStore = create<PumpPortalStore>((set, get) => ({
  tokens: [],
  isConnected: false,
  solPrice: null,
  addToken: (token) =>
    set((state) => ({
      tokens: [token, ...state.tokens].slice(0, 100),
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
      if (!token || !token.isValid) {
        debugLog('Trade', 'Skipping invalid token:', address);
        return state;
      }

      const now = Date.now();
      const solPrice = get().solPrice || 100;
      const tradeVolume = Number(trade.solAmount || 0) * solPrice;
      const isBuy = trade.txType === 'buy';

      debugLog('Trade', 'Processing trade:', {
        token: token.symbol,
        type: trade.txType,
        volume: tradeVolume,
        solPrice
      });

      // Calculate new price based on trade
      const newPrice = tradeVolume / TOTAL_SUPPLY;
      debugLog('Trade', 'New price calculated:', {
        oldPrice: token.price,
        newPrice,
        change: ((newPrice - token.price) / token.price * 100).toFixed(2) + '%'
      });

      // Update time windows
      const updatedWindows = { ...token.timeWindows };
      (Object.keys(TIME_WINDOWS) as Array<keyof typeof TIME_WINDOWS>).forEach(window => {
        const currentWindow = updatedWindows[window];
        const duration = TIME_WINDOWS[window];
        const windowStart = Math.floor(now / duration) * duration;

        if (now > currentWindow.endTime) {
          // Create new window
          updatedWindows[window] = {
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
          // Update existing window
          currentWindow.closePrice = newPrice;
          currentWindow.highPrice = Math.max(currentWindow.highPrice, newPrice);
          currentWindow.lowPrice = Math.min(currentWindow.lowPrice, newPrice);
          currentWindow.volume += tradeVolume;
          currentWindow.trades += 1;
          if (isBuy) currentWindow.buys += 1;
          else currentWindow.sells += 1;
        }
      });

      // Update recent trades
      const newTrade = {
        timestamp: now,
        price: newPrice,
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

      // Add debug log before state update
      debugLog('Trade', 'Updating token state:', {
        symbol: token.symbol,
        newPrice,
        volume24h,
        trades24h: trades24h.length
      });

      // Update token with new data
      return {
        tokens: state.tokens.map(t =>
          t.address === address ? {
            ...t,
            price: newPrice,
            marketCap: newPrice * TOTAL_SUPPLY,
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
    console.log('[PumpPortal] Raw data received:', data);
    const solPrice = await fetchSolPrice();

    const {
      mint,
      vSolInBondingCurve,
      marketCapSol,
      name,
      symbol,
      solAmount,
      traderPublicKey,
      txType,
      uri
    } = data;

    const marketCapUsd = Number(marketCapSol || 0) * solPrice;
    const liquidityUsd = Number(vSolInBondingCurve || 0) * solPrice;
    const volumeUsd = Number(solAmount || 0) * solPrice;

    const now = Date.now();
    const token: PumpPortalToken = {
      symbol: symbol || mint?.slice(0, 6) || 'Unknown',
      name: name || `Token ${mint?.slice(0, 8)}`,
      address: mint || '',
      price: marketCapUsd / TOTAL_SUPPLY,
      marketCap: marketCapUsd,
      liquidity: liquidityUsd,
      liquidityChange: 0,
      volume: volumeUsd,
      volume24h: volumeUsd,
      trades: 1,
      trades24h: 1,
      buys24h: txType === 'buy' ? 1 : 0,
      sells24h: txType === 'sell' ? 1 : 0,
      walletCount: 1,
      timestamp: now,
      uri: uri || '',  // Added URI from WebSocket data
      timeWindows: createEmptyTimeWindows(now),
      recentTrades: [{
        timestamp: now,
        price: marketCapUsd / TOTAL_SUPPLY,
        volume: volumeUsd,
        isBuy: txType === 'buy',
        wallet: traderPublicKey
      }],
      isValid: Boolean(mint && marketCapSol && vSolInBondingCurve)
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
        // Subscribe to new token events with proper keys parameter
        ws.send(JSON.stringify({
          method: "subscribeNewToken",
          keys: ["*"]  // Subscribe to all new tokens
        }));
        console.log('[PumpPortal] Subscribed to new token events');

        // Subscribe to trade events for all tokens
        ws.send(JSON.stringify({
          method: "subscribeTokenTrade",
          keys: ["*"]  // Subscribe to all token trades
        }));
        console.log('[PumpPortal] Subscribed to token trade events');
      }
    };

    ws.onmessage = async (event) => {
      try {
        const data = JSON.parse(event.data);
        debugLog('WebSocket', 'Received message:', data);

        if (data.message?.includes('Successfully subscribed')) {
          debugLog('WebSocket', 'Subscription confirmed');
          return;
        }

        // Handle new token creation
        if (data.txType === 'create' && data.mint) {
          debugLog('Token', 'Processing new token:', {
            mint: data.mint,
            symbol: data.symbol
          });

          try {
            const token = await mapPumpPortalData(data);
            if (token.isValid) {
              store.addToken(token);
              useHeliusStore.getState().subscribeToToken(data.mint);
              debugLog('Token', 'Successfully added new token:', {
                symbol: token.symbol,
                price: token.price,
                marketCap: token.marketCap
              });
            } else {
              debugLog('Token', 'Skipped invalid token:', data.mint);
            }
          } catch (err) {
            console.error('[PumpPortal] Failed to process token:', err);
          }
        }

        // Handle trade events
        if (['buy', 'sell'].includes(data.txType) && data.mint) {
          debugLog('Trade', 'Processing trade event:', {
            type: data.txType,
            mint: data.mint,
            amount: data.solAmount
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
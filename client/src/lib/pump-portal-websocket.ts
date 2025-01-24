import { create } from "zustand";
import { preloadTokenImages } from './token-metadata';
import axios from 'axios';

// Constants
const TOTAL_SUPPLY = 1_000_000_000;
const SOL_PRICE_UPDATE_INTERVAL = 10000; // Update every 10 seconds
const MAX_TRADES_PER_TOKEN = 100; // Limit stored trades
const RECONNECT_DELAY = 5000;
const MAX_RECONNECT_ATTEMPTS = 5;

// Types
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
    [key: string]: TimeWindowStats;
  };
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

// Helper functions
const createEmptyTimeWindow = (startTime: number): TimeWindowStats => ({
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
});

const calculatePriceImpact = (liquidity: number, tradeVolume: number, isBuy: boolean): number => {
  const impact = Math.min((tradeVolume / liquidity) * 0.005, 0.01); // Max 1% impact
  return isBuy ? (1 + impact) : (1 - impact);
};

// Store implementation
export const usePumpPortalStore = create<PumpPortalStore>((set, get) => ({
  tokens: [],
  isConnected: false,
  solPrice: 0,
  addToken: (token) => set((state) => ({
    tokens: [token, ...state.tokens].slice(0, 50), // Keep max 50 tokens
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

    // Calculate new price with impact
    const priceImpact = calculatePriceImpact(token.liquidity || 1, tradeVolume, isBuy);
    const newPrice = (token.price || 0) * priceImpact;

    // Create new trade record
    const newTrade = {
      timestamp: now,
      price: newPrice,
      volume: tradeVolume,
      isBuy,
      wallet: trade.traderPublicKey
    };

    // Keep recent trades limited
    const recentTrades = [newTrade, ...(token.recentTrades || [])].slice(0, MAX_TRADES_PER_TOKEN);

    // Calculate 24h stats
    const last24h = now - 24 * 60 * 60 * 1000;
    const trades24h = recentTrades.filter(t => t.timestamp > last24h);
    const volume24h = trades24h.reduce((sum, t) => sum + t.volume, 0);
    const buys24h = trades24h.filter(t => t.isBuy).length;
    const sells24h = trades24h.length - buys24h;

    // Calculate market cap and liquidity
    const newMarketCap = newPrice * TOTAL_SUPPLY;
    const newLiquidity = token.liquidity + (isBuy ? tradeVolume : -tradeVolume);
    const liquidityChange = ((newLiquidity - token.liquidity) / token.liquidity) * 100;

    // Update token state
    set((state) => ({
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
          recentTrades,
          walletCount: new Set(recentTrades.map(trade => trade.wallet)).size
        } : t
      )
    }));

    // Store trade in database with retries
    const storeTrade = async (retries = 3) => {
      for (let i = 0; i < retries; i++) {
        try {
          await axios.post('/api/trades', {
            token_address: address,
            timestamp: new Date(now),
            price_usd: newPrice,
            volume_usd: tradeVolume,
            amount_sol: Number(trade.solAmount),
            is_buy: isBuy,
            wallet_address: trade.traderPublicKey,
            tx_signature: trade.signature,
          }, {
            timeout: 5000,
            headers: {
              'Content-Type': 'application/json',
            }
          });
          return;
        } catch (error: any) {
          console.error(`[PumpPortal] Failed to store trade (attempt ${i + 1}/${retries}):`, 
            error.response?.status || error.message);
          if (i < retries - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
          }
        }
      }
    };
    storeTrade().catch(() => console.error('[PumpPortal] Failed to store trade after all retries'));
  },
  setConnected: (connected) => set({ isConnected: connected }),
  setSolPrice: (price) => {
    if (price > 0) {
      console.log('[PumpPortal] Setting SOL price:', price);
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
    url: 'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd',
    extract: (data: any) => data?.solana?.usd
  },
  {
    url: 'https://price.jup.ag/v4/price?ids=SOL',
    extract: (data: any) => data?.data?.SOL?.price
  },
  {
    url: '/api/solana/price', // Fallback to our own endpoint
    extract: (data: any) => data?.price
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
  return 100; // Final fallback price
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
    ws = new WebSocket('wss://pumpportal.fun/api/data');

    ws.onopen = () => {
      console.log('[PumpPortal] WebSocket connected');
      store.setConnected(true);
      reconnectAttempts = 0;

      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          method: "subscribeNewToken",
          keys: []
        }));

        const existingTokenAddresses = store.tokens.map(t => t.address);
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

        if (data.message?.includes('Successfully subscribed')) return;
        if (data.errors) {
          console.error('[PumpPortal] Error received:', data.errors);
          return;
        }

        if (data.txType === 'create' && data.mint) {
          try {
            const token = await mapPumpPortalData(data);
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
          } catch (err) {
            console.error('[PumpPortal] Failed to process token:', err);
          }
        } else if (['buy', 'sell'].includes(data.txType) && data.mint) {
          store.addTradeToHistory(data.mint, data);
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
        reconnectTimeout = setTimeout(initializePumpPortalWebSocket, RECONNECT_DELAY);
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
      reconnectTimeout = setTimeout(initializePumpPortalWebSocket, RECONNECT_DELAY);
    }
  }
}

// Initialize WebSocket connection
initializePumpPortalWebSocket();

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
      buys24h: 1, // Initial transaction is a buy
      sells24h: 0,
      walletCount: 1,
      timestamp: now,
      timeWindows: {
        '1m': createEmptyTimeWindow(now),
        '5m': createEmptyTimeWindow(now),
        '15m': createEmptyTimeWindow(now),
        '1h': createEmptyTimeWindow(now)
      },
      priceHistory: {},
      recentTrades: [{
        timestamp: now,
        price: priceUsd,
        volume: volumeUsd,
        isBuy: true, // Always mark initial dev wallet transaction as buy
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
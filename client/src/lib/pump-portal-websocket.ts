import { create } from 'zustand';
import { preloadTokenImages } from './token-metadata';
import { useHeliusStore } from './helius-websocket';
import axios from 'axios';

// Constants
const TOKEN_DECIMALS = 9; // Solana tokens use 9 decimals
const SOL_PRICE_UPDATE_INTERVAL = 10_000;  // 10 seconds
const MAX_TRADES_PER_TOKEN = 100;
const WS_URL = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`;
const RECONNECT_DELAY = 5000;
const MAX_RECONNECT_ATTEMPTS = 5;

export interface TokenTrade {
  signature: string;
  timestamp: number;
  price: number;     // price per token in SOL
  priceUsd: number;  // price per token in USD
  amount: number;    // how many tokens were traded
  solAmount: number; // how much SOL was traded
  type: 'buy' | 'sell';
  buyer: string;
  seller: string;
}

export interface PumpPortalToken {
  symbol: string;
  name: string;
  address: string;

  price: number;     // SOL per token
  priceUsd: number;  // USD per token

  marketCap: number; // in USD
  liquidity: number; // in USD

  volume: number;    // cumulative volume in USD
  volume24h: number; // 24h volume in USD

  trades: number;    
  trades24h: number;
  buys24h: number;
  sells24h: number;
  walletCount: number;

  recentTrades: TokenTrade[];
  imageLink?: string;

  // Bonding curve data
  vSolInBondingCurve: number;
  vTokensInBondingCurve: number;
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

  addToken: (token) => 
    set((state) => ({
      tokens: [token, ...state.tokens].slice(0, 50),
    })),

  updateToken: (address, updates) =>
    set((state) => ({
      tokens: state.tokens.map((token) =>
        token.address === address ? { ...token, ...updates } : token
      ),
    })),

  addTradeToHistory: (address, trade) => {
    const state = get();
    const token = state.tokens.find((t) => t.address === address);
    if (!token || !state.solPrice) return;

    // Get raw token amount with 9 decimals from PumpPortal
    const rawTokenAmount = Number(trade.tokenAmount || 0);
    const tokenAmount = rawTokenAmount / (10 ** TOKEN_DECIMALS);

    // Get raw SOL amount (already in SOL)
    const solAmount = Number(trade.solAmount || 0);

    // Calculate trade price (SOL per token)
    const tradePriceSol = tokenAmount > 0 ? solAmount / tokenAmount : 0;
    const tradePriceUsd = tradePriceSol * state.solPrice;

    // Get bonding curve data (raw values)
    const rawVTokens = Number(trade.vTokensInBondingCurve || 0);
    const rawVSol = Number(trade.vSolInBondingCurve || 0);
    const realVTokens = rawVTokens / (10 ** TOKEN_DECIMALS);

    // Calculate bonding curve price
    const bcPriceSol = realVTokens > 0 ? rawVSol / realVTokens : 0;
    const bcPriceUsd = bcPriceSol * state.solPrice;

    // Get market cap from server
    const marketCapSol = Number(trade.marketCapSol || 0);
    const marketCapUsd = marketCapSol * state.solPrice;

    // Calculate liquidity (total SOL in bonding curve)
    const liquidityUsd = rawVSol * state.solPrice;

    console.log('[Trade Debug]', {
      solAmount,
      tokenAmount,
      tradePriceSol,
      tradePriceUsd,
      bcPriceSol,
      bcPriceUsd,
      marketCapUsd,
      liquidityUsd
    });

    // Create trade record
    const newTrade: TokenTrade = {
      signature: trade.signature,
      timestamp: Date.now(),
      price: tradePriceSol,     // Use actual trade price
      priceUsd: tradePriceUsd,
      amount: tokenAmount,
      solAmount,
      type: trade.txType === 'buy' ? 'buy' : 'sell',
      buyer: trade.txType === 'buy' ? trade.traderPublicKey : trade.counterpartyPublicKey,
      seller: trade.txType === 'buy' ? trade.counterpartyPublicKey : trade.traderPublicKey,
    };

    // Get recent trades and calculate 24h stats
    const recentTrades = [newTrade, ...token.recentTrades].slice(0, MAX_TRADES_PER_TOKEN);
    const cutoff24h = Date.now() - 24 * 60 * 60 * 1000;
    const trades24h = recentTrades.filter((tr) => tr.timestamp > cutoff24h);

    // Update token state
    set((state) => ({
      tokens: state.tokens.map((t) => {
        if (t.address !== address) return t;

        return {
          ...t,
          price: bcPriceSol,       // Use bonding curve price as "current" price
          priceUsd: bcPriceUsd,
          marketCap: marketCapUsd,
          liquidity: liquidityUsd,
          volume: t.volume + (solAmount * state.solPrice),
          volume24h: trades24h.reduce((sum, tr) => sum + (tr.solAmount * state.solPrice), 0),
          trades: t.trades + 1,
          trades24h: trades24h.length,
          buys24h: trades24h.filter((x) => x.type === 'buy').length,
          sells24h: trades24h.filter((x) => x.type === 'sell').length,
          recentTrades,
          vSolInBondingCurve: rawVSol,
          vTokensInBondingCurve: rawVTokens,
          walletCount: new Set(recentTrades.flatMap((x) => [x.buyer, x.seller])).size,
        };
      }),
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

// Initialize WebSocket connection
let ws: WebSocket | null = null;
let reconnectTimeout: NodeJS.Timeout | null = null;
let reconnectAttempts = 0;
let solPriceInterval: NodeJS.Timeout | null = null;

const API_ENDPOINTS = [
  {
    url: 'https://api.binance.com/api/v3/ticker/price?symbol=SOLUSDT',
    extract: (data: any) => Number(data?.price),
  },
];

// Fetch SOL Price
const fetchSolanaPrice = async (retries = 3): Promise<number> => {
  for (const endpoint of API_ENDPOINTS) {
    for (let i = 0; i < retries; i++) {
      try {
        const response = await axios.get(endpoint.url);
        const price = endpoint.extract(response.data);
        if (typeof price === 'number' && price > 0) {
          return price;
        }
      } catch (error) {
        console.error(`[PumpPortal] Error fetching SOL price:`, error);
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
  }
  return 100; // fallback
};

// Initialize WebSocket connection
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

    // Get initial SOL price
    fetchSolanaPrice().then((price) => {
      store.setSolPrice(price);
      solPriceInterval = setInterval(async () => {
        try {
          const newPrice = await fetchSolanaPrice();
          store.setSolPrice(newPrice);
        } catch (error) {
          console.error('[PumpPortal] Failed to update SOL price:', error);
        }
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

            const token = mapPumpPortalData(data);
            store.addToken(token);

            if (token.imageLink) {
              preloadTokenImages([{ imageLink: token.imageLink, symbol: token.symbol }]);
            }

            // Subscribe to Helius updates for this token
            useHeliusStore.getState().subscribeToToken(token.address);

            // Subscribe to PumpPortal updates
            ws?.send(JSON.stringify({
              method: 'subscribeTokenTrade',
              keys: [token.address],
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
        reconnectTimeout = setTimeout(
          initializePumpPortalWebSocket,
          RECONNECT_DELAY * Math.pow(1.5, reconnectAttempts)
        );
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
      reconnectTimeout = setTimeout(
        initializePumpPortalWebSocket,
        RECONNECT_DELAY * Math.pow(1.5, reconnectAttempts)
      );
    }
  }
}

export function mapPumpPortalData(data: any): PumpPortalToken {
  const {
    mint,
    vSolInBondingCurve,
    vTokensInBondingCurve,
    marketCapSol,
    name,
    symbol,
    solAmount,
    imageLink,
  } = data;

  const solPrice = usePumpPortalStore.getState().solPrice || 0;

  // Convert raw values to numbers
  const rawVSol = Number(vSolInBondingCurve || 0);
  const rawVTokens = Number(vTokensInBondingCurve || 0);
  const realVTokens = rawVTokens / (10 ** TOKEN_DECIMALS);

  // Calculate price from bonding curve
  const priceSol = realVTokens > 0 ? rawVSol / realVTokens : 0;
  const priceUsd = priceSol * solPrice;

  // Use market cap from server
  const mcapSol = Number(marketCapSol || 0);
  const marketCapUsd = mcapSol * solPrice;

  // Calculate liquidity and volume
  const liquidityUsd = rawVSol * solPrice;
  const volumeUsd = (Number(solAmount || 0)) * solPrice;

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

    trades: 0,
    trades24h: 0,
    buys24h: 0,
    sells24h: 0,
    walletCount: 0,

    recentTrades: [],
    vSolInBondingCurve: rawVSol,
    vTokensInBondingCurve: rawVTokens,
    imageLink: imageLink || 'https://via.placeholder.com/150',
  };
}

// Initialize on load
initializePumpPortalWebSocket();
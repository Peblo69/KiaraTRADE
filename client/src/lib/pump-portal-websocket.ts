/***************************************************
 * pump-portal-websocket.ts (Revised / Final)
 ***************************************************/
import { create } from 'zustand';
import { preloadTokenImages } from './token-metadata';
import axios from 'axios';

// --- Constants ---
const SOL_PRICE_UPDATE_INTERVAL = 10_000;  // 10 seconds
const MAX_TRADES_PER_TOKEN = 100;
const WS_URL = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`;
const RECONNECT_DELAY = 5000;
const MAX_RECONNECT_ATTEMPTS = 5;

// If your token is actually stored with decimals in your backend, set this to 9. 
// If your backend is sending "tokenAmount" as whole tokens with no decimals, set to 0.
const TOKEN_DECIMALS = 0;

// If you want to reference the 1 billion supply for your own market cap logic:
const PUMPFUN_TOTAL_SUPPLY = 1_000_000_000;

export interface TokenTrade {
  signature: string;
  timestamp: number;
  price: number;     // price per token in SOL
  priceUsd: number;  // price per token in USD
  amount: number;    // how many SOL were exchanged
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

// ----------------- Zustand Store ------------------
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

  /*********************************************
   * addTradeToHistory
   *********************************************/
  addTradeToHistory: (address, trade) => {
    const state = get();
    const token = state.tokens.find((t) => t.address === address);
    if (!token || !state.solPrice) return;

    const now = Date.now();

    /************************************************
     * 1) Handle SOL amount (already in decimal SOL)
     ***********************************************/
    const solAmount = Number(trade.solAmount || 0);

    /************************************************
     * 2) Convert token amount (using 9 decimals)
     ***********************************************/
    const rawTokenAmount = Number(trade.tokenAmount || 0);
    const userTokenAmount = rawTokenAmount / 1e9;

    /************************************************
     * 3) Actual fill price => (sol spent) / (tokens)
     ***********************************************/
    let fillPriceSol = 0;
    if (userTokenAmount > 0) {
      fillPriceSol = solAmount / userTokenAmount;
    }
    const fillPriceUsd = fillPriceSol * state.solPrice;

    // Is it a buy or sell?
    const isBuy = trade.txType === 'buy';

    // Buyer/seller addresses
    const buyerAddress = isBuy ? trade.traderPublicKey : trade.counterpartyPublicKey;
    const sellerAddress = isBuy ? trade.counterpartyPublicKey : trade.traderPublicKey;

    // 4) Bonding-curve data if you want to display or recalc
    const rawVSol = Number(trade.vSolInBondingCurve || 0); // presumably in SOL
    const rawVTokens = Number(trade.vTokensInBondingCurve || 0);
    const vTokens = rawVTokens / 10 ** TOKEN_DECIMALS;
    const bondingCurvePriceSol = vTokens > 0 ? rawVSol / vTokens : 0;

    // 5) Market cap from server (or compute from fillPrice * supply)
    const marketCapSol = Number(trade.marketCapSol || 0);
    // If you prefer using the fill price & total supply:
    // let marketCapSol = fillPriceSol * PUMPFUN_TOTAL_SUPPLY;

    const marketCapUsd = marketCapSol * state.solPrice;

    // 6) Liquidity in USD = how many SOL in curve * solPrice
    const liquidityUsd = rawVSol * state.solPrice;

    // 7) This trade's volume in USD
    const tradeVolumeUsd = solAmount * state.solPrice;

    console.log('[Trade Debug]', {
      solAmount,       // how many SOL used
      userTokenAmount, // how many tokens bought/sold
      fillPriceSol,
      fillPriceUsd,
      bondingCurvePriceSol,
      marketCapUsd,
      liquidityUsd,
      tradeVolumeUsd,
    });

    // 8) Build trade record
    const newTrade: TokenTrade = {
      signature: trade.signature,
      timestamp: now,
      price: fillPriceSol,     // actual fill price (SOL per token)
      priceUsd: fillPriceUsd,
      amount: solAmount,       // total SOL changed
      type: isBuy ? 'buy' : 'sell',
      buyer: buyerAddress,
      seller: sellerAddress,
    };

    // 9) Insert into recentTrades
    const recentTrades = [newTrade, ...token.recentTrades].slice(0, MAX_TRADES_PER_TOKEN);

    // 10) Recompute 24h trades
    const cutoff24h = now - 24 * 60 * 60 * 1000;
    const trades24h = recentTrades.filter((tr) => tr.timestamp > cutoff24h);

    // Approx. 24h volume in USD = sum of SOL amounts * current solPrice
    const volume24hUsd = trades24h.reduce(
      (sum, tr) => sum + tr.amount * state.solPrice,
      0
    );

    // 11) Cumulative volume
    const newCumulativeVolumeUsd = token.volume + tradeVolumeUsd;

    // 12) Update store
    set((storeState) => ({
      tokens: storeState.tokens.map((t) => {
        if (t.address !== address) return t;

        return {
          ...t,
          // If you want the "official token price" to be the latest fill price:
          price: fillPriceSol,
          priceUsd: fillPriceUsd,

          // If you prefer the pool ratio as "price":
          // price: bondingCurvePriceSol,
          // priceUsd: bondingCurvePriceSol * state.solPrice,

          marketCap: marketCapUsd,
          liquidity: liquidityUsd,
          volume: newCumulativeVolumeUsd,
          volume24h: volume24hUsd,

          trades: t.trades + 1,
          trades24h: trades24h.length,
          buys24h: trades24h.filter((x) => x.type === 'buy').length,
          sells24h: trades24h.filter((x) => x.type === 'sell').length,

          recentTrades,
          walletCount: new Set(
            recentTrades.flatMap((x) => [x.buyer, x.seller])
          ).size,
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

// ------------------- WebSocket Logic -------------------
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

// ------------------- init WebSocket -------------------
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
        
        // Detailed token logging
        if (type === 'newToken') {
          console.log('[PumpPortal] New Token Details:', {
            name: data.name,
            symbol: data.symbol,
            mint: data.mint,
            initialBuy: data.initialBuy,
            bondingCurveKey: data.bondingCurveKey,
            vTokensInBondingCurve: data.vTokensInBondingCurve,
            vSolInBondingCurve: data.vSolInBondingCurve,
            marketCapSol: data.marketCapSol,
            solAmount: data.solAmount,
            imageLink: data.imageLink,
            uri: data.uri
          });
        }
        else if (type === 'trade') {
          console.log('[PumpPortal] Trade Details:', {
            mint: data.mint,
            txType: data.txType,
            tokenAmount: data.tokenAmount,
            solAmount: data.solAmount,
            bondingCurveKey: data.bondingCurveKey,
            vTokensInBondingCurve: data.vTokensInBondingCurve, 
            vSolInBondingCurve: data.vSolInBondingCurve,
            marketCapSol: data.marketCapSol
          });
        }

        switch (type) {
          case 'newToken': {
            const token = mapPumpPortalData(data);
            store.addToken(token);
            if (token.imageLink) {
              preloadTokenImages([{ imageLink: token.imageLink, symbol: token.symbol }]);
            }
            // subscribe
            ws?.send(
              JSON.stringify({
                method: 'subscribeTokenTrade',
                keys: [token.address],
              })
            );
            break;
          }
          case 'trade':
            store.addTradeToHistory(data.mint, data);
            break;
          default:
            // ...
            break;
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

    window.addEventListener('beforeunload', cleanup);
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

// ------------------- mapPumpPortalData -------------------
export function mapPumpPortalData(data: any): PumpPortalToken {
  const {
    mint,
    vSolInBondingCurve,
    vTokensInBondingCurve,
    marketCapSol,
    name,
    symbol,
    solAmount,
    traderPublicKey,
    imageLink,
  } = data;

  const solPrice = usePumpPortalStore.getState().solPrice || 0;

  // 1) Bonding-curve ratio (pool price)
  const rawVSol = Number(vSolInBondingCurve || 0);
  const rawVTokens = Number(vTokensInBondingCurve || 0);

  const realVTokens = rawVTokens / 10 ** TOKEN_DECIMALS; // if your token uses decimals
  const priceSol = realVTokens > 0 ? rawVSol / realVTokens : 0;
  const priceUsd = priceSol * solPrice;

  // 2) Market cap from the server or from 1B supply
  // If your server sets `marketCapSol`, we multiply by solPrice:
  let mcSol = Number(marketCapSol || 0);
  let marketCapUsd = mcSol * solPrice;

  // If you prefer computing from the bonding-curve ratio:
  // let mcSol = priceSol * PUMPFUN_TOTAL_SUPPLY;
  // let marketCapUsd = mcSol * solPrice;

  // 3) Liquidity in USD
  const liquidityUsd = rawVSol * solPrice;

  // 4) Volume in USD
  // Typically, `solAmount` might be lamports or decimal SOL. 
  // We'll assume it's decimal SOL here:
  const volumeUsd = (Number(solAmount || 0)) * solPrice;

  // Build the token object
  const now = Date.now();
  return {
    symbol: symbol || mint?.slice(0, 6) || 'Unknown',
    name: name || `Token ${mint?.slice(0, 8)}`,
    address: mint || '',

    // Start the "current price" at the bonding-curve ratio
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
}

// Initialize on load
initializePumpPortalWebSocket();

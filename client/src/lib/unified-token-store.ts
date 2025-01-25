import { create } from 'zustand';
import { Connection, PublicKey } from '@solana/web3.js';
import axios from 'axios';

// Constants
const HELIUS_API_KEY = import.meta.env.VITE_HELIUS_API_KEY;
const HELIUS_WS_URL = `wss://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;
const PUMP_PORTAL_WS_URL = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`;
const RECONNECT_DELAY = 5000;
const MAX_RECONNECT_ATTEMPTS = 5;
const SOL_PRICE_UPDATE_INTERVAL = 10000;

interface Transaction {
  signature: string;
  buyer: string;
  seller: string;
  solAmount: number;
  tokenAmount: number;
  price: number;
  timestamp: number;
  type: 'buy' | 'sell' | 'trade';
  priceImpact?: number;
}

interface TokenData {
  name: string;
  symbol: string;
  marketCap: number;
  marketCapSol: number;
  liquidityAdded: boolean;
  holders: number;
  volume24h: number;
  address: string;
  price: number;
  priceUsd?: number;
  liquidityUsd?: number;
  liquidityChange24h?: number;
  lastTradeTime?: number;
  highPrice24h?: number;
  lowPrice24h?: number;
  recentTrades?: Transaction[];
}

interface UnifiedTokenState {
  tokens: TokenData[];
  transactions: Record<string, Transaction[]>;
  isConnected: boolean;
  connectionError: string | null;
  activeToken: string | null;
  solPrice: number;
  addToken: (token: TokenData) => void;
  updateToken: (address: string, updates: Partial<TokenData>) => void;
  addTransaction: (tokenAddress: string, transaction: Transaction) => void;
  setConnected: (status: boolean) => void;
  setError: (error: string | null) => void;
  getToken: (address: string) => TokenData | undefined;
  getTransactions: (address: string) => Transaction[];
  setActiveToken: (address: string | null) => void;
  setSolPrice: (price: number) => void;
}

let heliusWs: WebSocket | null = null;
let pumpPortalWs: WebSocket | null = null;
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
  for (const endpoint of API_ENDPOINTS) {
    for (let i = 0; i < retries; i++) {
      try {
        const response = await axios.get(endpoint.url);
        const price = endpoint.extract(response.data);
        if (typeof price === 'number' && price > 0) return price;
      } catch (error) {
        console.error(`[UnifiedToken] SOL price fetch error:`, error);
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
      }
    }
  }
  return 0;
};

export const useUnifiedTokenStore = create<UnifiedTokenState>((set, get) => ({
  tokens: [],
  transactions: {},
  isConnected: false,
  connectionError: null,
  activeToken: null,
  solPrice: 0,
  addToken: (token) => set((state) => {
    const existingIndex = state.tokens.findIndex(t => t.address === token.address);
    if (existingIndex >= 0) {
      const tokens = [...state.tokens];
      tokens[existingIndex] = { ...tokens[existingIndex], ...token };
      return { tokens };
    }
    return { tokens: [...state.tokens, token] };
  }),
  updateToken: (address, updates) => set(state => ({
    tokens: state.tokens.map(token => 
      token.address === address ? { ...token, ...updates } : token
    )
  })),
  addTransaction: (tokenAddress, transaction) => set((state) => {
    const existingTransactions = state.transactions[tokenAddress] || [];
    const token = state.tokens.find(t => t.address === tokenAddress);
    if (!token) return state;

    // Check for duplicates
    const isDuplicate = existingTransactions.some(tx => 
      tx.signature === transaction.signature || 
      (Math.abs(tx.timestamp - transaction.timestamp) < 500 && 
       Math.abs(tx.solAmount - transaction.solAmount) < 0.000001)
    );

    if (isDuplicate) return state;

    const updatedTrades = [transaction, ...existingTransactions]
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 500);

    // Update token with latest trade data
    const newPrice = transaction.price;
    const volumeChange = transaction.solAmount * (get().solPrice || 0);

    set(state => ({
      tokens: state.tokens.map(t =>
        t.address === tokenAddress ? {
          ...t,
          price: newPrice,
          priceUsd: newPrice * (get().solPrice || 0),
          volume24h: (t.volume24h || 0) + volumeChange,
          lastTradeTime: transaction.timestamp,
          recentTrades: updatedTrades
        } : t
      )
    }));

    return {
      transactions: {
        ...state.transactions,
        [tokenAddress]: updatedTrades
      }
    };
  }),
  setConnected: (status) => set({ isConnected: status, connectionError: null }),
  setError: (error) => set({ connectionError: error }),
  getToken: (address) => get().tokens.find(token => token.address === address),
  getTransactions: (address) => get().transactions[address] || [],
  setActiveToken: (address) => set({ activeToken: address }),
  setSolPrice: (price) => set({ solPrice: price })
}));

// Initialize WebSocket connections
const initializeWebSockets = () => {
  if (typeof window === 'undefined') return;

  const store = useUnifiedTokenStore.getState();

  // Initialize SOL price updates
  const initializeSolPrice = async () => {
    const price = await fetchSolanaPrice();
    store.setSolPrice(price);
    solPriceInterval = setInterval(async () => {
      const price = await fetchSolanaPrice();
      store.setSolPrice(price);
    }, SOL_PRICE_UPDATE_INTERVAL);
  };

  // Initialize Helius WebSocket
  const initializeHelius = () => {
    if (heliusWs) return;

    heliusWs = new WebSocket(HELIUS_WS_URL);

    heliusWs.onopen = () => {
      console.log('[UnifiedToken] Helius WebSocket connected');
      store.setConnected(true);
      reconnectAttempts = 0;
    };

    heliusWs.onclose = () => {
      console.log('[UnifiedToken] Helius WebSocket disconnected');
      if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttempts++;
        reconnectTimeout = setTimeout(initializeHelius, RECONNECT_DELAY);
      }
    };

    heliusWs.onmessage = async (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'transaction') {
          const tx = await processHeliusTransaction(data);
          if (tx) {
            store.addTransaction(tx.tokenAddress, tx);
          }
        }
      } catch (error) {
        console.error('[UnifiedToken] Helius message error:', error);
      }
    };
  };

  // Initialize PumpPortal WebSocket
  const initializePumpPortal = () => {
    if (pumpPortalWs) return;

    pumpPortalWs = new WebSocket(PUMP_PORTAL_WS_URL);

    pumpPortalWs.onopen = () => {
      console.log('[UnifiedToken] PumpPortal WebSocket connected');
      store.setConnected(true);
      reconnectAttempts = 0;
    };

    pumpPortalWs.onclose = () => {
      console.log('[UnifiedToken] PumpPortal WebSocket disconnected');
      if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttempts++;
        reconnectTimeout = setTimeout(initializePumpPortal, RECONNECT_DELAY);
      }
    };

    pumpPortalWs.onmessage = async (event) => {
      try {
        const { type, data } = JSON.parse(event.data);
        switch (type) {
          case 'newToken':
            store.addToken(data);
            break;
          case 'trade':
            const transaction = processPumpPortalTrade(data);
            if (transaction) {
              store.addTransaction(data.tokenAddress, transaction);
            }
            break;
        }
      } catch (error) {
        console.error('[UnifiedToken] PumpPortal message error:', error);
      }
    };
  };

  // Initialize all connections
  initializeSolPrice();
  initializeHelius();
  initializePumpPortal();

  // Cleanup function
  return () => {
    if (heliusWs) heliusWs.close();
    if (pumpPortalWs) pumpPortalWs.close();
    if (solPriceInterval) clearInterval(solPriceInterval);
    if (reconnectTimeout) clearTimeout(reconnectTimeout);
  };
};

// Helper functions for processing messages
const processHeliusTransaction = async (data: any) => {
  try {
    const connection = new Connection(`https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`);
    const tx = await connection.getTransaction(data.signature, { maxSupportedTransactionVersion: 0 });
    if (!tx?.meta) return null;

    // Process transaction data
    const solAmount = Math.abs(tx.meta.preBalances[0] - tx.meta.postBalances[0]) / 1e9;
    const timestamp = tx.blockTime ? tx.blockTime * 1000 : Date.now();
    const tokenAddress = data.tokenAddress;

    return {
      signature: data.signature,
      timestamp,
      tokenAddress,
      solAmount,
      type: 'trade',
      price: solAmount * (useUnifiedTokenStore.getState().solPrice || 0)
    };
  } catch (error) {
    console.error('[UnifiedToken] Process Helius transaction error:', error);
    return null;
  }
};

const processPumpPortalTrade = (data: any) => {
  try {
    const solPrice = useUnifiedTokenStore.getState().solPrice;
    return {
      signature: data.signature,
      timestamp: Date.now(),
      tokenAddress: data.tokenAddress,
      solAmount: Number(data.solAmount) || 0,
      type: data.type || 'trade',
      price: (Number(data.solAmount) || 0) * (solPrice || 0)
    };
  } catch (error) {
    console.error('[UnifiedToken] Process PumpPortal trade error:', error);
    return null;
  }
};

// Initialize connections when in browser
if (typeof window !== 'undefined') {
  initializeWebSockets();
}
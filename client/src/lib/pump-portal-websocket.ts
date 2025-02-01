import { create } from 'zustand';
import { Time } from 'lightweight-charts';

export interface TokenTrade {
  signature: string;
  mint: string;
  timestamp: number;
  txType: 'buy' | 'sell';
  tokenAmount: number;
  solAmount: number;
  traderPublicKey: string;
  priceInUsd?: number;
  priceInSol?: number;
}

export interface PumpPortalToken {
  address: string;
  name: string;
  symbol: string;
  priceInUsd?: number;
  priceInSol?: number;
  marketCapSol: number;
  volume24h?: number;
  trades: TokenTrade[];
}

interface PumpPortalStore {
  tokens: PumpPortalToken[];
  trades: TokenTrade[];
  solPrice: number;
  isConnected: boolean;
  getToken: (address: string) => PumpPortalToken | undefined;
  addToken: (token: PumpPortalToken) => void;
  updateTokenMetrics: (address: string, metrics: { 
    priceInUsd?: number;
    priceInSol?: number;
    marketCapSol?: number;
    volume24h?: number;
  }) => void;
  addTrade: (trade: TokenTrade) => void;
  setSolPrice: (price: number) => void;
  setConnected: (connected: boolean) => void;
}

export const usePumpPortalStore = create<PumpPortalStore>((set, get) => ({
  tokens: [],
  trades: [],
  solPrice: 0,
  isConnected: false,

  getToken: (address) => {
    return get().tokens.find(t => t.address === address);
  },

  addToken: (token) => set(state => ({
    tokens: [...state.tokens, { ...token, trades: [] }]
  })),

  updateTokenMetrics: (address, metrics) => set(state => ({
    tokens: state.tokens.map(token =>
      token.address === address
        ? { ...token, ...metrics }
        : token
    )
  })),

  addTrade: (trade) => set(state => {
    // Add to global trades list
    const updatedTrades = [trade, ...state.trades].slice(0, 1000); // Keep last 1000 trades

    // Add to token's trades list
    const updatedTokens = state.tokens.map(token => {
      if (token.address === trade.mint) {
        const tokenTrades = [trade, ...(token.trades || [])].slice(0, 100); // Keep last 100 trades per token
        return { ...token, trades: tokenTrades };
      }
      return token;
    });

    return {
      trades: updatedTrades,
      tokens: updatedTokens
    };
  }),

  setSolPrice: (price) => set({ solPrice: price }),
  setConnected: (connected) => set({ isConnected: connected })
}));

export default usePumpPortalStore;
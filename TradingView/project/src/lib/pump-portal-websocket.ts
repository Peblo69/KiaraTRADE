import { create } from 'zustand';
import { Time } from 'lightweight-charts';

export interface TokenTrade {
  signature: string;
  mint: string;
  txType: 'buy' | 'sell';
  tokenAmount: number;
  solAmount: number;
  traderPublicKey: string;
  counterpartyPublicKey?: string;
  timestamp: number;
  priceInUsd?: number;
  priceInSol?: number;
  isDevTrade?: boolean;
}

export interface PumpPortalToken {
  address: string;
  name: string;
  symbol: string;
  priceInUsd?: number;
  priceInSol?: number;
  vTokensInBondingCurve: number;
  vSolInBondingCurve: number;
  marketCapSol: number;
  recentTrades: TokenTrade[];
  devWallet?: string;
}

interface PumpPortalStore {
  tokens: PumpPortalToken[];
  trades: TokenTrade[];
  solPrice: number;
  isConnected: boolean;
  getToken: (address: string) => PumpPortalToken | undefined;
  addToken: (token: PumpPortalToken) => void;
  updateTokenPrice: (address: string, priceInUsd: number) => void;
  addTradeToHistory: (tokenAddress: string, trade: TokenTrade) => void;
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
    tokens: [...state.tokens, { ...token, recentTrades: [] }]
  })),

  updateTokenPrice: (address, priceInUsd) => set(state => ({
    tokens: state.tokens.map(token =>
      token.address === address
        ? { ...token, priceInUsd }
        : token
    )
  })),

  addTradeToHistory: (tokenAddress, trade) => set(state => {
    const updatedTokens = state.tokens.map(token => {
      if (token.address === tokenAddress) {
        const recentTrades = [trade, ...token.recentTrades].slice(0, 100); // Keep last 100 trades
        return { ...token, recentTrades };
      }
      return token;
    });

    return {
      tokens: updatedTokens,
      trades: [trade, ...state.trades].slice(0, 1000) // Keep last 1000 trades globally
    };
  }),

  setSolPrice: (price) => set({ solPrice: price }),
  setConnected: (connected) => set({ isConnected: connected })
}));

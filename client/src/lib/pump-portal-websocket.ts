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
  counterpartyPublicKey?: string;
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
  volume24h?: number;
  recentTrades: TokenTrade[];
  devWallet?: string;
}

interface PumpPortalStore {
  tokens: PumpPortalToken[];
  isConnected: boolean;
  solPrice: number;
  getToken: (address: string) => PumpPortalToken | undefined;
  addToken: (token: PumpPortalToken) => void;
  updateTokenPrice: (address: string, priceInUsd: number) => void;
  addTradeToHistory: (tokenAddress: string, trade: TokenTrade) => void;
  setSolPrice: (price: number) => void;
  setConnected: (connected: boolean) => void;
}

export const usePumpPortalStore = create<PumpPortalStore>((set, get) => ({
  tokens: [],
  isConnected: false,
  solPrice: 0,

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
    const token = state.tokens.find(t => t.address === tokenAddress);
    if (!token) return state;

    // Add trade to token's history
    const updatedToken = {
      ...token,
      recentTrades: [trade, ...token.recentTrades].slice(0, 100), // Keep last 100 trades
    };

    // Update token price calculations
    if (trade.solAmount && trade.tokenAmount) {
      const priceInSol = trade.solAmount / trade.tokenAmount;
      updatedToken.priceInSol = priceInSol;
      updatedToken.priceInUsd = priceInSol * state.solPrice;
    }

    // Update the tokens list
    return {
      tokens: state.tokens.map(t =>
        t.address === tokenAddress ? updatedToken : t
      )
    };
  }),

  setSolPrice: (price) => set({ solPrice: price }),
  setConnected: (connected) => set({ isConnected: connected })
}));

export default usePumpPortalStore;
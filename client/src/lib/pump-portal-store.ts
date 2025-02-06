import { create } from 'zustand';

interface Token {
  symbol: string;
  priceInUsd: number;
  marketCapSol: number;
  vSolInBondingCurve: number;
  devWallet?: string;
  imageUrl?: string;
  metadata?: {
    mint?: boolean;
    uri?: string;
    imageUrl?: string;
  };
  recentTrades?: Array<{
    timestamp: number;
    priceInUsd: number;
  }>;
}

interface PumpPortalStore {
  tokens: Record<string, Token>;
  getToken: (address: string) => Token | undefined;
  setToken: (address: string, token: Token) => void;
}

export const usePumpPortalStore = create<PumpPortalStore>((set, get) => ({
  tokens: {},
  getToken: (address: string) => get().tokens[address],
  setToken: (address: string, token: Token) =>
    set((state) => ({
      tokens: {
        ...state.tokens,
        [address]: token,
      },
    })),
}));

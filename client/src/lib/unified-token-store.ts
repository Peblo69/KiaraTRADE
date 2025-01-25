import { create } from 'zustand';
import { usePumpPortalStore } from './pump-portal-websocket';

interface Transaction {
  signature: string;
  buyer: string;
  seller: string;
  solAmount: number;
  tokenAmount: number;
  price: number;
  timestamp: number;
  type: 'buy' | 'sell' | 'trade';
}

interface UnifiedTokenState {
  tokens: any[];
  transactions: Record<string, any[]>;
  isConnected: boolean;
  connectionError: string | null;
  activeToken: string | null;
  addToken: (token: any) => void;
  updateToken: (address: string, updates: any) => void;
  addTransaction: (tokenAddress: string, transaction: any) => void;
  setConnected: (status: boolean) => void;
  setError: (error: string | null) => void;
  getToken: (address: string) => any | undefined;
  getTransactions: (address: string) => any[];
  setActiveToken: (address: string | null) => void;
}

export const useUnifiedTokenStore = create<UnifiedTokenState>((set, get) => ({
  tokens: [],
  transactions: {},
  isConnected: false,
  connectionError: null,
  activeToken: null,
  addToken: (token) =>
    set((state) => {
      if (!token?.address) return state;

      const now = Date.now();
      const solPrice = usePumpPortalStore.getState().solPrice || 0;

      // Calculate USD values
      const marketCapUsd = token.marketCapSol * solPrice;
      const priceUsd = token.price * solPrice;

      const updatedToken = {
        ...token,
        marketCap: marketCapUsd,
        priceUSD: priceUsd,
        lastUpdated: now
      };

      const existingIndex = state.tokens.findIndex(t => t.address === token.address);

      if (existingIndex >= 0) {
        const existing = state.tokens[existingIndex];
        const hasSignificantChange = 
          Math.abs(existing.price - token.price) > 0.000001 ||
          Math.abs(existing.marketCapSol - token.marketCapSol) > 0.01 ||
          now - (existing.lastUpdated || 0) > 5000;

        if (!hasSignificantChange) return state;

        const updatedTokens = [...state.tokens];
        updatedTokens[existingIndex] = updatedToken;
        return { tokens: updatedTokens };
      }

      return {
        tokens: [...state.tokens, updatedToken]
          .sort((a, b) => (b.marketCapSol || 0) - (a.marketCapSol || 0))
          .slice(0, 100)
      };
    }),
  updateToken: (address, updates) => set(state => ({
    tokens: state.tokens.map(token => 
      token.address === address ? { ...token, ...updates } : token
    )
  })),
  addTransaction: (tokenAddress, transaction) =>
    set((state) => {
      const existingTransactions = state.transactions[tokenAddress] || [];
      const token = state.tokens.find(t => t.address === tokenAddress);
      if (!token) return state;

      // Calculate price impact
      const solPrice = usePumpPortalStore.getState().solPrice || 0;
      const priceImpact = (transaction.solAmount * solPrice) / token.marketCap * 100;

      const enrichedTransaction = {
        ...transaction,
        priceImpact,
        priceUSD: transaction.price * solPrice
      };

      // Check for duplicates with more precise matching
      const isDuplicate = existingTransactions.some(tx => 
        tx.signature === transaction.signature || 
        (Math.abs(tx.timestamp - transaction.timestamp) < 500 && 
         Math.abs(tx.solAmount - transaction.solAmount) < 0.000001)
      );

      if (isDuplicate) return state;

      const updatedTrades = [enrichedTransaction, ...existingTransactions]
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 500);

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
  setActiveToken: (address) => set({ activeToken: address })
}));
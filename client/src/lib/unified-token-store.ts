import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface Transaction {
  signature: string;
  buyer: string;
  solAmount: number;
  tokenAmount: number;
  timestamp: number;
  type: 'buy' | 'sell';
}

interface TokenMetadata {
  name: string;
  symbol: string;
  description?: string;
  image: string;
  showName?: boolean;
  createdOn?: string;
  twitter?: string;
  website?: string;
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
  imageUrl?: string;
  uri?: string;
  initialBuy?: number;
  solAmount?: number;
  priceChange24h?: number;
  metadata?: TokenMetadata;
  source?: 'pumpfun' | 'unified';
  lastUpdated?: number;
}

interface UnifiedTokenState {
  tokens: TokenData[];
  transactions: Record<string, Transaction[]>;
  isConnected: boolean;
  connectionError: string | null;
  addToken: (token: TokenData, source: 'pumpfun' | 'unified') => void;
  updateToken: (address: string, updates: Partial<TokenData>) => void;
  addTransaction: (tokenAddress: string, transaction: Transaction) => void;
  setConnected: (status: boolean) => void;
  setError: (error: string | null) => void;
  getToken: (address: string) => TokenData | undefined;
  getTransactions: (address: string) => Transaction[];
}

export const useUnifiedTokenStore = create<UnifiedTokenState>()(
  (set, get) => ({
    tokens: [],
    transactions: {},
    isConnected: false,
    connectionError: null,

    addToken: (token, source) => {
      set((state) => {
        // Check if token already exists
        const existingTokenIndex = state.tokens.findIndex(t => t.address === token.address);

        if (existingTokenIndex >= 0) {
          // Update existing token
          const updatedTokens = [...state.tokens];
          updatedTokens[existingTokenIndex] = {
            ...updatedTokens[existingTokenIndex],
            ...token,
            source,
            lastUpdated: Date.now()
          };
          return { tokens: updatedTokens };
        }

        // Add new token
        return {
          tokens: [
            ...state.tokens,
            {
              ...token,
              source,
              lastUpdated: Date.now(),
            }
          ].sort((a, b) => b.marketCapSol - a.marketCapSol).slice(0, 100)
        };
      });
    },

    updateToken: (address, updates) => {
      set((state) => {
        const tokenIndex = state.tokens.findIndex(token => token.address === address);
        if (tokenIndex === -1) return state;

        const updatedTokens = [...state.tokens];
        updatedTokens[tokenIndex] = {
          ...updatedTokens[tokenIndex],
          ...updates,
          lastUpdated: Date.now(),
        };

        return { tokens: updatedTokens };
      });
    },

    addTransaction: (tokenAddress, transaction) => {
      set((state) => {
        const existingTransactions = state.transactions[tokenAddress] || [];
        if (existingTransactions.some(tx => tx.signature === transaction.signature)) {
          return state;
        }
        return {
          transactions: {
            ...state.transactions,
            [tokenAddress]: [transaction, ...existingTransactions].slice(0, 10)
          }
        };
      });
    },

    setConnected: (status) => set({ isConnected: status, connectionError: null }),
    setError: (error) => set({ connectionError: error }),
    getToken: (address) => get().tokens.find(token => token.address === address),
    getTransactions: (address) => get().transactions[address] || [],
  })
);
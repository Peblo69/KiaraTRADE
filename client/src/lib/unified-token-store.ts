import { create } from 'zustand';

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
}

interface UnifiedTokenState {
  tokens: TokenData[];
  transactions: Record<string, Transaction[]>;
  isConnected: boolean;
  connectionError: string | null;

  addToken: (token: TokenData) => void;
  updateToken: (address: string, updates: Partial<TokenData>) => void;
  addTransaction: (tokenAddress: string, transaction: Transaction) => void;
  setConnected: (status: boolean) => void;
  setError: (error: string | null) => void;

  getToken: (address: string) => TokenData | undefined;
  getTransactions: (address: string) => Transaction[];
}

export const useUnifiedTokenStore = create<UnifiedTokenState>()((set, get) => ({
  tokens: [],
  transactions: {},
  isConnected: false,
  connectionError: null,

  addToken: (token) => {
    set((state) => ({
      tokens: [
        ...state.tokens,
        {
          ...token,
          lastUpdated: Date.now(),
        }
      ].sort((a, b) => b.marketCapSol - a.marketCapSol).slice(0, 100)
    }));
  },

  updateToken: (address, updates) => {
    set((state) => {
      const tokens = state.tokens.map((token) =>
        token.address === address
          ? { ...token, ...updates }
          : token
      );
      return { tokens };
    });
  },

  addTransaction: (tokenAddress, transaction) => {
    set((state) => {
      const transactions = state.transactions[tokenAddress] || [];
      if (transactions.some(tx => tx.signature === transaction.signature)) {
        return state;
      }
      return {
        transactions: {
          ...state.transactions,
          [tokenAddress]: [transaction, ...transactions].slice(0, 10)
        }
      };
    });
  },

  setConnected: (status) => set({ isConnected: status, connectionError: null }),
  setError: (error) => set({ connectionError: error }),
  getToken: (address) => get().tokens.find(token => token.address === address),
  getTransactions: (address) => get().transactions[address] || [],
}));
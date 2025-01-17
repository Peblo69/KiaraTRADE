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
  lastUpdated?: number;
}

interface UnifiedTokenState {
  tokens: TokenData[];
  transactions: Record<string, Transaction[]>;
  isConnected: boolean;
  connectionError: string | null;

  // Actions
  addToken: (token: TokenData) => void;
  updateToken: (address: string, updates: Partial<TokenData>) => void;
  addTransaction: (tokenAddress: string, transaction: Transaction) => void;
  setConnected: (status: boolean) => void;
  setError: (error: string | null) => void;

  // Selectors
  getToken: (address: string) => TokenData | undefined;
  getTransactions: (address: string) => Transaction[];
}

export const useUnifiedTokenStore = create<UnifiedTokenState>()(
  devtools(
    (set, get) => ({
      tokens: [],
      transactions: {},
      isConnected: false,
      connectionError: null,

      addToken: (token) => {
        const initialPrice = token.solAmount && token.initialBuy
          ? token.solAmount / token.initialBuy
          : 0;

        set((state) => ({
          tokens: [...state.tokens, {
            ...token,
            price: initialPrice,
            lastUpdated: Date.now(),
          }].sort((a, b) => b.marketCapSol - a.marketCapSol).slice(0, 100),
        }));
      },

      updateToken: (address, updates) => {
        set((state) => {
          const currentToken = state.tokens.find(token => token.address === address);
          if (!currentToken) return state;

          const priceChange24h = updates.price !== undefined && currentToken.price !== undefined
            ? ((updates.price - currentToken.price) / currentToken.price) * 100
            : currentToken.priceChange24h;

          return {
            tokens: state.tokens.map((token) =>
              token.address === address
                ? {
                    ...token,
                    ...updates,
                    priceChange24h,
                    lastUpdated: Date.now()
                  }
                : token
            )
          };
        });
      },

      addTransaction: (tokenAddress, transaction) => {
        set((state) => {
          const tokenTransactions = state.transactions[tokenAddress] || [];
          if (tokenTransactions.some(tx => tx.signature === transaction.signature)) {
            return state;
          }

          return {
            transactions: {
              ...state.transactions,
              [tokenAddress]: [transaction, ...tokenTransactions].slice(0, 10)
            }
          };
        });
      },

      setConnected: (status) => {
        set({ isConnected: status, connectionError: null });
      },

      setError: (error) => {
        set({ connectionError: error });
      },

      getToken: (address) => {
        return get().tokens.find(token => token.address === address);
      },

      getTransactions: (address) => {
        return get().transactions[address] || [];
      },
    }),
    { name: 'unified-token-store' }
  )
);
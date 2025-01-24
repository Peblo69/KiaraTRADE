import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Transaction {
  signature: string;
  buyer: string;
  solAmount: number;
  tokenAmount: number;
  timestamp: number;
  type: 'buy' | 'sell' | 'trade';
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

interface Trade {
  timestamp: number;
  price: number;
  priceUSD: number;
  signature: string;
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
  source?: 'unified';
  lastUpdated?: number;
  trades: Trade[];
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

export const useUnifiedTokenStore = create<UnifiedTokenState>()(
  persist(
    (set, get) => ({
      tokens: [],
      transactions: {},
      isConnected: false,
      connectionError: null,

      addToken: (token) => set((state) => {
        if (!token?.address) return state;

        const existingTokenIndex = state.tokens.findIndex(t => t.address === token.address);

        if (existingTokenIndex >= 0) {
          const existingToken = state.tokens[existingTokenIndex];
          const hasChanged = existingToken.price !== token.price ||
                           existingToken.marketCapSol !== token.marketCapSol ||
                           existingToken.volume24h !== token.volume24h;

          if (!hasChanged) return state;

          const updatedTokens = [...state.tokens];
          updatedTokens[existingTokenIndex] = {
            ...existingToken,
            ...token,
            lastUpdated: Date.now(),
            trades: token.trades?.length ? 
              [...new Set([...token.trades, ...existingToken.trades]
                .map(trade => JSON.stringify(trade)))]
                .map(str => JSON.parse(str))
                .sort((a, b) => b.timestamp - a.timestamp)
                .slice(0, 1000) : 
              existingToken.trades
          };
          return { tokens: updatedTokens };
        }

        console.log('[Unified Store] Adding new token:', token.address);
        return {
          tokens: [
            ...state.tokens,
            {
              ...token,
              trades: token.trades || [],
              lastUpdated: Date.now()
            }
          ].sort((a, b) => b.marketCapSol - a.marketCapSol).slice(0, 100)
        };
      }),

      updateToken: (address, updates) => set((state) => {
        const tokenIndex = state.tokens.findIndex(token => token.address === address);
        if (tokenIndex === -1) return state;

        const currentToken = state.tokens[tokenIndex];
        const hasChanged = Object.keys(updates).some(key => 
          updates[key as keyof TokenData] !== currentToken[key as keyof TokenData]
        );

        if (!hasChanged) return state;

        const updatedTokens = [...state.tokens];
        updatedTokens[tokenIndex] = {
          ...currentToken,
          ...updates,
          lastUpdated: Date.now()
        };

        return { tokens: updatedTokens };
      }),

      addTransaction: (tokenAddress, transaction) => set((state) => {
        const existingTransactions = state.transactions[tokenAddress] || [];
        if (existingTransactions.some(tx => tx.signature === transaction.signature)) {
          return state;
        }

        return {
          transactions: {
            ...state.transactions,
            [tokenAddress]: [transaction, ...existingTransactions].slice(0, 1000)
          }
        };
      }),

      setConnected: (status) => set((state) => {
        if (state.isConnected === status) return state;
        console.log('[Unified Store] Connection status changed:', status);
        return { isConnected: status, connectionError: null };
      }),

      setError: (error) => set({ connectionError: error }),
      getToken: (address) => get().tokens.find(token => token.address === address),
      getTransactions: (address) => get().transactions[address] || [],
    }),
    {
      name: 'unified-token-store',
      storage: localStorage,
      version: 1,
    }
  )
);
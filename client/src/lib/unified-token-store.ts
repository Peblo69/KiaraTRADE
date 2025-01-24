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
  type: 'buy' | 'sell';
  buyer: string;
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
  source?: 'unified' | 'helius' | 'pumpportal';
  lastUpdated?: number;
  trades: Trade[];
  previousPrice?: number;
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

const persistOptions = {
  name: 'unified-token-store',
  version: 1,
  getStorage: () => ({
    getItem: (name: string) => {
      try {
        const value = localStorage.getItem(name);
        return value ? JSON.parse(value) : null;
      } catch (error) {
        console.error('[Store] Error reading from localStorage:', error);
        return null;
      }
    },
    setItem: (name: string, value: any) => {
      try {
        localStorage.setItem(name, JSON.stringify(value));
      } catch (error) {
        console.error('[Store] Error writing to localStorage:', error);
      }
    },
    removeItem: (name: string) => localStorage.removeItem(name),
  }),
};

export const useUnifiedTokenStore = create<UnifiedTokenState>()(
  persist(
    (set, get) => ({
      tokens: [],
      transactions: {},
      isConnected: false,
      connectionError: null,

      addToken: (token) => set((state) => {
        if (!token?.address) {
          console.warn('[Store] Invalid token data:', token);
          return state;
        }

        const existingTokenIndex = state.tokens.findIndex(t => t.address === token.address);

        if (existingTokenIndex >= 0) {
          const existingToken = state.tokens[existingTokenIndex];
          const hasChanged = 
            existingToken.price !== token.price ||
            existingToken.marketCapSol !== token.marketCapSol ||
            existingToken.volume24h !== token.volume24h;

          if (!hasChanged) return state;

          const updatedTokens = [...state.tokens];
          updatedTokens[existingTokenIndex] = {
            ...existingToken,
            ...token,
            previousPrice: existingToken.price,
            lastUpdated: Date.now(),
            trades: token.trades?.length ? 
              [...new Set([...token.trades, ...(existingToken.trades || [])]
                .map(trade => JSON.stringify(trade)))]
                .map(str => JSON.parse(str))
                .sort((a, b) => b.timestamp - a.timestamp)
                .slice(0, 1000) : 
              existingToken.trades || []
          };

          return { tokens: updatedTokens };
        }

        console.log('[Store] Adding new token:', token.address);
        return {
          tokens: [
            ...state.tokens,
            {
              ...token,
              trades: token.trades || [],
              lastUpdated: Date.now(),
              liquidityAdded: token.liquidityAdded ?? false,
              marketCapSol: token.marketCapSol ?? 0,
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
          previousPrice: updates.price !== undefined ? currentToken.price : currentToken.previousPrice,
          lastUpdated: Date.now()
        };

        return { tokens: updatedTokens };
      }),

      addTransaction: (tokenAddress, transaction) => set((state) => {
        const existingTransactions = state.transactions[tokenAddress] || [];
        if (existingTransactions.some(tx => tx.signature === transaction.signature)) {
          return state;
        }

        const updatedTransactions = {
          ...state.transactions,
          [tokenAddress]: [transaction, ...existingTransactions].slice(0, 1000)
        };

        // Update token metrics based on the new transaction
        const tokenIndex = state.tokens.findIndex(t => t.address === tokenAddress);
        if (tokenIndex >= 0) {
          const token = state.tokens[tokenIndex];
          const updatedTokens = [...state.tokens];

          // Calculate 24h volume
          const now = Date.now();
          const oneDayAgo = now - 24 * 60 * 60 * 1000;
          const recentTransactions = updatedTransactions[tokenAddress].filter(
            tx => tx.timestamp > oneDayAgo
          );

          const volume24h = recentTransactions.reduce(
            (sum, tx) => sum + tx.solAmount,
            0
          );

          updatedTokens[tokenIndex] = {
            ...token,
            volume24h,
            lastUpdated: now,
          };

          return {
            transactions: updatedTransactions,
            tokens: updatedTokens,
          };
        }

        return { transactions: updatedTransactions };
      }),

      setConnected: (status) => set((state) => {
        if (state.isConnected === status) return state;
        console.log('[Store] Connection status changed:', status);
        return { isConnected: status, connectionError: null };
      }),

      setError: (error) => set({ connectionError: error }),
      getToken: (address) => get().tokens.find(token => token.address === address),
      getTransactions: (address) => get().transactions[address] || [],
    }),
    persistOptions
  )
);
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
  devtools(
    (set, get) => ({
      tokens: [],
      transactions: {},
      isConnected: false,
      connectionError: null,

      addToken: (token, source) => {
        console.log(`[UnifiedTokenStore] Adding token from ${source}:`, {
          address: token.address,
          name: token.name,
          symbol: token.symbol
        });

        set((state) => {
          // Check if token already exists
          const existingToken = state.tokens.find(t => t.address === token.address);
          if (existingToken) {
            // Update existing token
            return {
              tokens: state.tokens.map(t => 
                t.address === token.address
                  ? { 
                      ...t, 
                      ...token,
                      source,
                      lastUpdated: Date.now()
                    }
                  : t
              )
            };
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
        console.log('[UnifiedTokenStore] Updating token:', {
          address,
          updates
        });

        set((state) => {
          const currentToken = state.tokens.find(token => token.address === address);
          if (!currentToken) return state;

          const updatedTokens = state.tokens.map((token) =>
            token.address === address
              ? {
                  ...token,
                  ...updates,
                  lastUpdated: Date.now(),
                  priceChange24h: updates.price !== undefined && token.price !== undefined
                    ? ((updates.price - token.price) / token.price) * 100
                    : token.priceChange24h
                }
              : token
          );

          return { 
            tokens: updatedTokens.sort((a, b) => b.marketCapSol - a.marketCapSol)
          };
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

      setConnected: (status) => {
        console.log('[UnifiedTokenStore] Connection status:', status);
        set({ isConnected: status, connectionError: null });
      },

      setError: (error) => {
        console.log('[UnifiedTokenStore] Error:', error);
        set({ connectionError: error });
      },

      getToken: (address) => get().tokens.find(token => token.address === address),
      getTransactions: (address) => get().transactions[address] || [],
    }),
    { name: 'unified-token-store' }
  )
);
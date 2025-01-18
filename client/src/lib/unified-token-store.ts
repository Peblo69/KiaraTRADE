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

export const useUnifiedTokenStore = create<UnifiedTokenState>()((set, get) => ({
  tokens: [],
  transactions: {},
  isConnected: false,
  connectionError: null,

  addToken: (token, source) => set(state => {
    // Check if token already exists and if it's actually different
    const existingTokenIndex = state.tokens.findIndex(t => t.address === token.address);

    if (existingTokenIndex >= 0) {
      const existingToken = state.tokens[existingTokenIndex];
      const hasChanged = existingToken.price !== token.price ||
                        existingToken.marketCapSol !== token.marketCapSol ||
                        existingToken.volume24h !== token.volume24h;

      if (!hasChanged) return state; // No changes needed

      const updatedTokens = [...state.tokens];
      updatedTokens[existingTokenIndex] = {
        ...existingToken,
        ...token,
        source,
        lastUpdated: Date.now()
      };
      return { tokens: updatedTokens };
    }

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
  }),

  updateToken: (address, updates) => set(state => {
    const tokenIndex = state.tokens.findIndex(token => token.address === address);
    if (tokenIndex === -1) return state;

    const currentToken = state.tokens[tokenIndex];
    const hasChanged = Object.keys(updates).some(key => 
      updates[key as keyof TokenData] !== currentToken[key as keyof TokenData]
    );

    if (!hasChanged) return state; // No changes needed

    const updatedTokens = [...state.tokens];
    updatedTokens[tokenIndex] = {
      ...currentToken,
      ...updates,
      lastUpdated: Date.now(),
    };

    return { tokens: updatedTokens };
  }),

  addTransaction: (tokenAddress, transaction) => set(state => {
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
  }),

  setConnected: (status) => set(state => {
    if (state.isConnected === status) return state; // Prevent unnecessary updates
    return { isConnected: status, connectionError: null };
  }),

  setError: (error) => set({ connectionError: error }),
  getToken: (address) => get().tokens.find(token => token.address === address),
  getTransactions: (address) => get().transactions[address] || [],
}));
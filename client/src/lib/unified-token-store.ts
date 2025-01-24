import { create } from 'zustand';

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
  trades?: Trade[];
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
  setActiveToken: (address: string) => void;
}

export const useUnifiedTokenStore = create<UnifiedTokenState>()((set, get) => ({
  tokens: [],
  transactions: {},
  isConnected: false,
  connectionError: null,

  addToken: (token) => set(state => {
    // Validate token data
    if (!token?.address) return state;

    // Force update timestamp
    token.lastUpdated = Date.now();

    // Use Map for O(1) lookup with forced updates
    const tokenMap = new Map(state.tokens.map(t => [t.address, {
      ...t,
      needsUpdate: Date.now() - (t.lastUpdated || 0) > 2000
    }]));

    const existingToken = tokenMap.get(token.address);

    // Always update if token needs update or has new data
    const shouldUpdate = existingToken?.needsUpdate || 
                        !existingToken ||
                        token.price !== existingToken.price ||
                        token.volume !== existingToken.volume;

    if (!shouldUpdate) return state;

    if (existingToken) {
      const hasChanged = existingToken.price !== token.price ||
                        existingToken.marketCapSol !== token.marketCapSol ||
                        existingToken.volume24h !== token.volume24h ||
                        Date.now() - (existingToken.lastUpdated || 0) > 5000;

      if (!hasChanged) return state;

      // Update existing token
      const updatedTokens = [...state.tokens];
      updatedTokens[state.tokens.findIndex(t => t.address === token.address)] = {
        ...existingToken,
        ...token,
        lastUpdated: Date.now()
      };
      return { tokens: updatedTokens };
    }

    // Add new token
    console.log('[Unified Store] Adding new token:', token.address);
    return {
      tokens: [
        ...state.tokens,
        {
          ...token,
          lastUpdated: Date.now(),
        }
      ].sort((a, b) => b.marketCapSol - a.marketCapSol).slice(0, 100)
    };
  }),

  updateToken: (address, updates) => set(state => {
    const tokenIndex = state.tokens.findIndex(token => token.address === address);
    if (tokenIndex === -1) return state;

    const currentToken = state.tokens[tokenIndex];

    // Only update if there are actual changes
    const hasChanged = Object.keys(updates).some(key => 
      updates[key as keyof TokenData] !== currentToken[key as keyof TokenData]
    );

    if (!hasChanged) return state; // Prevent unnecessary updates

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

    // Enhanced duplicate check
    const isDuplicate = existingTransactions.some(tx => 
      tx.signature === transaction.signature ||
      (Math.abs(tx.timestamp - transaction.timestamp) < 1000 && 
       tx.amount === transaction.amount && 
       tx.type === transaction.type)
    );

    if (isDuplicate) return state;

    // Keep more history and sort by timestamp
    const maxTrades = 500;
    const updatedTrades = [transaction, ...existingTransactions]
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, maxTrades);

    return {
      transactions: {
        ...state.transactions,
        [tokenAddress]: updatedTrades
      }
    };
  }),

  setConnected: (status) => set(state => {
    if (state.isConnected === status) return state; // Prevent unnecessary updates
    console.log('[Unified Store] Connection status changed:', status);
    return { isConnected: status, connectionError: null };
  }),

  setError: (error) => set({ connectionError: error }),
  getToken: (address) => get().tokens.find(token => token.address === address),
  getTransactions: (address) => get().transactions[address] || [],
  setActiveToken: (address) => set({ activeToken: address })
}));
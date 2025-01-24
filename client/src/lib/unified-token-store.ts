import { create } from 'zustand';

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
  addToken: (token) => set(state => {
    const existingToken = state.tokens.find(t => t.address === token.address);
    if (existingToken) {
      return {
        tokens: state.tokens.map(t => 
          t.address === token.address ? { ...t, ...token } : t
        )
      };
    }
    return { tokens: [...state.tokens, token] };
  }),
  updateToken: (address, updates) => set(state => ({
    tokens: state.tokens.map(token => 
      token.address === address ? { ...token, ...updates } : token
    )
  })),
  addTransaction: (tokenAddress, transaction) => set(state => ({
    transactions: {
      ...state.transactions,
      [tokenAddress]: [transaction, ...(state.transactions[tokenAddress] || [])].slice(0, 100)
    }
  })),
  setConnected: (status) => set({ isConnected: status, connectionError: null }),
  setError: (error) => set({ connectionError: error }),
  getToken: (address) => get().tokens.find(token => token.address === address),
  getTransactions: (address) => get().transactions[address] || [],
  setActiveToken: (address) => set({ activeToken: address })
}));
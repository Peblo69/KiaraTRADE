import { create } from 'zustand';

interface UnifiedTokenState {
  tokens: any[]; // Array to hold token objects.
  transactions: Record<string, any[]>; // Object mapping token addresses to an array of transactions.
  isConnected: boolean; // Boolean indicating whether the connection is active.
  connectionError: string | null; // Any error message related to the connection.
  activeToken: string | null; // The address of the currently active token.

  // Functions (actions) provided by the store:
  addToken: (token: any) => void; // Add a new token or update an existing token.
  updateToken: (address: string, updates: any) => void; // Update token data for a specific token.
  addTransaction: (tokenAddress: string, transaction: any) => void; // Add a transaction to a token's transaction list.
  setConnected: (status: boolean) => void; // Set the connection status.
  setError: (error: string | null) => void; // Set or clear the connection error.
  getToken: (address: string) => any | undefined; // Retrieve a token by its address.
  getTransactions: (address: string) => any[]; // Retrieve the transactions for a specific token.
  setActiveToken: (address: string | null) => void; // Set the currently active token.
}

export const useUnifiedTokenStore = create<UnifiedTokenState>((set, get) => ({
  tokens: [],
  transactions: {},
  isConnected: false,
  connectionError: null,
  activeToken: null,

  // Adds a new token to the store. If the token already exists (based on its address),
  // it merges the new token data with the existing token data.
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

  // Updates an existing token identified by its address with the provided updates.
  updateToken: (address, updates) => set(state => ({
    tokens: state.tokens.map(token => 
      token.address === address ? { ...token, ...updates } : token
    )
  })),

  // Adds a transaction to the specified token's transactions list.
  // The list is kept to a maximum of 100 transactions.
  addTransaction: (tokenAddress, transaction) => set(state => ({
    transactions: {
      ...state.transactions,
      [tokenAddress]: [transaction, ...(state.transactions[tokenAddress] || [])].slice(0, 100)
    }
  })),

  // Sets the connection status (e.g., whether the WebSocket is connected)
  // and clears any connection errors.
  setConnected: (status) => set({ isConnected: status, connectionError: null }),

  // Sets a connection error message.
  setError: (error) => set({ connectionError: error }),

  // Retrieves a token by its address.
  getToken: (address) => get().tokens.find(token => token.address === address),

  // Retrieves the transactions associated with a given token address.
  getTransactions: (address) => get().transactions[address] || [],

  // Sets the active token (the token currently being viewed/selected).
  setActiveToken: (address) => set({ activeToken: address })
}));

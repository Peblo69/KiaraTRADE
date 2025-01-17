import { create } from 'zustand';

interface Transaction {
  signature: string;
  buyer: string;
  solAmount: number;
  tokenAmount: number;
  timestamp: number;
  type: 'buy' | 'sell';
}

interface TransactionHistoryState {
  transactions: Record<string, Transaction[]>;
  addTransaction: (tokenAddress: string, transaction: Transaction) => void;
  getTransactions: (tokenAddress: string) => Transaction[];
}

export const useTransactionHistoryStore = create<TransactionHistoryState>((set, get) => ({
  transactions: {},

  addTransaction: (tokenAddress: string, transaction: Transaction) => {
    set((state) => {
      const tokenTransactions = state.transactions[tokenAddress] || [];
      
      // Add new transaction to the beginning of the array
      const updatedTransactions = [
        transaction,
        ...tokenTransactions
      ].slice(0, 10); // Keep only last 10 transactions

      return {
        transactions: {
          ...state.transactions,
          [tokenAddress]: updatedTransactions,
        },
      };
    });
  },

  getTransactions: (tokenAddress: string) => {
    return get().transactions[tokenAddress] || [];
  },
}));

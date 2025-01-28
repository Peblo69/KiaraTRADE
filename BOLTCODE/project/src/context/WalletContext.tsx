import React, { createContext, useContext, useState, useCallback } from 'react';
import { WalletBalance } from '../types/trading';

interface WalletContextType {
  balance: WalletBalance | null;
  connectWallet: () => Promise<boolean>;
  addFunds: (amount: string) => Promise<boolean>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [balance, setBalance] = useState<WalletBalance | null>(null);

  const connectWallet = useCallback(async () => {
    try {
      // Implement wallet connection logic
      return true;
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      return false;
    }
  }, []);

  const addFunds = useCallback(async (amount: string) => {
    try {
      // Implement add funds logic
      return true;
    } catch (error) {
      console.error('Failed to add funds:', error);
      return false;
    }
  }, []);

  const value = {
    balance,
    connectWallet,
    addFunds
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
}

export const useWalletContext = () => {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWalletContext must be used within a WalletProvider');
  }
  return context;
};
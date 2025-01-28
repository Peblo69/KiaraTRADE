import React, { createContext, useContext, useState, useCallback } from 'react';
import { Chain } from '../types/trading';

interface TokenContextType {
  selectedChain: Chain | null;
  setSelectedChain: (chain: Chain) => Promise<void>;
  availableChains: Chain[];
}

const TokenContext = createContext<TokenContextType | undefined>(undefined);

export function TokenProvider({ children }: { children: React.ReactNode }) {
  const [selectedChain, setSelectedChain] = useState<Chain | null>(null);
  
  const handleChainChange = useCallback(async (chain: Chain) => {
    // Implement chain switching logic
    setSelectedChain(chain);
  }, []);

  const value = {
    selectedChain,
    setSelectedChain: handleChainChange,
    availableChains: [
      // Define available chains
    ]
  };

  return (
    <TokenContext.Provider value={value}>
      {children}
    </TokenContext.Provider>
  );
}

export const useTokenContext = () => {
  const context = useContext(TokenContext);
  if (context === undefined) {
    throw new Error('useTokenContext must be used within a TokenProvider');
  }
  return context;
};
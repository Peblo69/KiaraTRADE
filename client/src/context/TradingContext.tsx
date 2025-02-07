import React, { createContext, useContext, useState, useCallback } from 'react';

export interface Trade {
  timestamp: number;
  price: number;
  amount: number;
  type: 'buy' | 'sell';
}

interface TradingContextType {
  trades: Trade[];
  addTrade: (trade: Trade) => void;
}

const TradingContext = createContext<TradingContextType>({
  trades: [],
  addTrade: () => {},
});

export const useTradingContext = () => useContext(TradingContext);

export const TradingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [trades, setTrades] = useState<Trade[]>([]);

  const addTrade = useCallback((trade: Trade) => {
    setTrades(prev => [...prev, trade].sort((a, b) => a.timestamp - b.timestamp));
  }, []);

  return (
    <TradingContext.Provider value={{ trades, addTrade }}>
      {children}
    </TradingContext.Provider>
  );
};
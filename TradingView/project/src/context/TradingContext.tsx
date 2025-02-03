import React, { createContext, useContext, useState } from 'react';
import type { Trade, OrderBook } from '../types/trading';

interface TradingContextType {
  trades: Trade[];
  orderBook: OrderBook;
  loading: boolean;
  error: Error | null;
  createTrade: (data: {
    type: 'market' | 'limit';
    side: 'buy' | 'sell';
    amount: number;
    price: number;
    walletId: string;
  }) => Promise<void>;
}

const TradingContext = createContext<TradingContextType | undefined>(undefined);

export function TradingProvider({ children }: { children: React.ReactNode }) {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [orderBook, setOrderBook] = useState<OrderBook>({ asks: [], bids: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const createTrade = async (data: {
    type: 'market' | 'limit';
    side: 'buy' | 'sell';
    amount: number;
    price: number;
    walletId: string;
  }) => {
    try {
      // Create a new trade object
      const newTrade: Trade = {
        id: Date.now(),
        timestamp: Date.now(),
        type: data.type,
        side: data.side,
        amount: data.amount,
        price: data.price,
        wallet: data.walletId,
        status: 'completed'
      };

      // Update local state
      setTrades(prev => [newTrade, ...prev]);

      // Return the created trade
      return newTrade;
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  };

  const value: TradingContextType = {
    trades,
    orderBook,
    loading,
    error,
    createTrade,
  };

  return (
    <TradingContext.Provider value={value}>
      {children}
    </TradingContext.Provider>
  );
}

export function useTradingContext() {
  const context = useContext(TradingContext);
  if (context === undefined) {
    throw new Error('useTradingContext must be used within a TradingProvider');
  }
  return context;
}
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

export const TradingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
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
  }): Promise<void> => {
    try {
      setLoading(true);
      // Create a new trade object
      const newTrade: Trade = {
        id: Date.now(),
        timestamp: Date.now(),
        type: data.type,
        side: data.side,
        amount: data.amount,
        price: data.price,
        wallet: data.walletId,
        status: 'completed',
        amountUSD: data.amount * data.price,
        amountSOL: data.amount,
        maker: false,
        fee: 0
      };

      // Update local state
      setTrades(prev => [newTrade, ...prev]);
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const value = {
    trades,
    orderBook,
    loading,
    error,
    createTrade
  };

  return (
    <TradingContext.Provider value={value}>
      {children}
    </TradingContext.Provider>
  );
};

export function useTradingContext() {
  const context = useContext(TradingContext);
  if (context === undefined) {
    throw new Error('useTradingContext must be used within a TradingProvider');
  }
  return context;
}

export default TradingContext;
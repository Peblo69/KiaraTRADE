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
  }) => Promise<void>;
}

const TradingContext = createContext<TradingContextType | undefined>(undefined);

export function TradingProvider({ children }: { children: React.ReactNode }) {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [orderBook, setOrderBook] = useState<OrderBook>({ asks: [], bids: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Mock trade creation
  const createTrade = async (data: {
    type: 'market' | 'limit';
    side: 'buy' | 'sell';
    amount: number;
    price: number;
  }) => {
    try {
      const newTrade: Trade = {
        id: Math.random().toString(36).substr(2, 9),
        price: data.price,
        amount: data.amount,
        amountUSD: data.price * data.amount,
        amountSOL: data.amount * 0.5,
        side: data.side,
        timestamp: Date.now(),
        wallet: '0x1234...5678',
        maker: Math.random() > 0.5,
        fee: 0.1
      };

      setTrades(current => [newTrade, ...current]);
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  };

  return (
    <TradingContext.Provider value={{
      trades,
      orderBook,
      loading,
      error,
      createTrade
    }}>
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
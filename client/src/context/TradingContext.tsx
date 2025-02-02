import React, { createContext, useContext, useState, useEffect } from 'react';
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

  // Simulated trade creation without Supabase
  const createTrade = async (data: {
    type: 'market' | 'limit';
    side: 'buy' | 'sell';
    amount: number;
    price: number;
    walletId: string;
  }) => {
    try {
      const newTrade: Trade = {
        id: Date.now(),
        mint: data.walletId,
        timestamp: Date.now(),
        tokenAmount: data.amount,
        priceInUsd: data.price,
        side: data.side,
        wallet: data.walletId,
        created_at: new Date()
      };
      setTrades(prev => [newTrade, ...prev]);
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
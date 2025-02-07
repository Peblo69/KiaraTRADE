import React, { createContext, useContext, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export interface Trade {
  id: string;
  type: 'market' | 'limit';
  side: 'buy' | 'sell';
  amount: number;
  price: number;
  timestamp: number;
  maker: boolean;
  fee: number;
  wallet: string;
  amountUSD: number;
  amountSOL: number;
}

export interface OrderBook {
  asks: Array<[number, number]>;
  bids: Array<[number, number]>;
}

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

  const createTrade = useCallback(async (data: {
    type: 'market' | 'limit';
    side: 'buy' | 'sell';
    amount: number;
    price: number;
    walletId: string;
  }) => {
    setLoading(true);
    setError(null);

    try {
      const { data: trade, error: err } = await supabase
        .from('trades')
        .insert([{
          type: data.type,
          side: data.side,
          amount: data.amount,
          price: data.price,
          wallet_id: data.walletId,
          timestamp: new Date().toISOString()
        }])
        .select()
        .single();

      if (err) throw err;

      const newTrade: Trade = {
        id: trade.id,
        ...data,
        timestamp: Date.now(),
        maker: Math.random() > 0.5,
        fee: 0.1,
        wallet: data.walletId,
        amountUSD: data.price * data.amount,
        amountSOL: data.amount,
      };

      setTrades(current => [newTrade, ...current]);
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

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

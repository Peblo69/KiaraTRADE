import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // Subscribe to trades
    const tradesSubscription = supabase
      .channel('trades')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trades' }, payload => {
        setTrades(current => [payload.new as Trade, ...current].slice(0, 50));
      })
      .subscribe();

    // Subscribe to order book
    const orderBookSubscription = supabase
      .channel('order_book')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_book' }, () => {
        fetchOrderBook();
      })
      .subscribe();

    // Initial data fetch
    fetchInitialData();

    return () => {
      tradesSubscription.unsubscribe();
      orderBookSubscription.unsubscribe();
    };
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [tradesData, orderBookData] = await Promise.all([
        supabase.from('trades').select('*').order('created_at', { ascending: false }).limit(50),
        supabase.from('order_book').select('*').order('price', { ascending: false })
      ]);

      if (tradesData.error) throw tradesData.error;
      if (orderBookData.error) throw orderBookData.error;

      setTrades(tradesData.data);
      processOrderBook(orderBookData.data);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  const fetchOrderBook = async () => {
    try {
      const { data, error } = await supabase
        .from('order_book')
        .select('*')
        .order('price', { ascending: false });

      if (error) throw error;
      processOrderBook(data);
    } catch (err) {
      setError(err as Error);
    }
  };

  const processOrderBook = (data: any[]) => {
    const asks = data.filter(order => order.side === 'sell')
      .map(order => [order.price, order.amount]);
    const bids = data.filter(order => order.side === 'buy')
      .map(order => [order.price, order.amount]);

    setOrderBook({ asks, bids });
  };

  const createTrade = async (data: {
    type: 'market' | 'limit';
    side: 'buy' | 'sell';
    amount: number;
    price: number;
    walletId: string;
  }) => {
    try {
      const { error } = await supabase.rpc('create_trade', {
        p_user_id: (await supabase.auth.getUser()).data.user?.id,
        p_wallet_id: data.walletId,
        p_type: data.type,
        p_side: data.side,
        p_amount: data.amount,
        p_price: data.price
      });

      if (error) throw error;
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

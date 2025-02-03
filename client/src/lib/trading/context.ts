import React, { createContext, useContext, useState, useEffect } from 'react';
import type { Trade, OrderBook } from './types';
import { usePumpPortalStore } from '@/lib/pump-portal-websocket';

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
  }) => Promise<Trade>;
  lastSolPrice: number | null;
  priceError: string | null;
}

const TradingContext = createContext<TradingContextType | undefined>(undefined);

export function TradingProvider({ children }: { children: React.ReactNode }) {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [orderBook, setOrderBook] = useState<OrderBook>({ asks: [], bids: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastSolPrice, setLastSolPrice] = useState<number | null>(null);
  const [priceError, setPriceError] = useState<string | null>(null);

  // Get SOL price from PumpPortal store with error handling
  const solPrice = usePumpPortalStore(state => state.solPrice);
  const isConnected = usePumpPortalStore(state => state.isConnected);

  // Update lastSolPrice when solPrice changes
  useEffect(() => {
    try {
      if (!isConnected) {
        console.warn('WebSocket not connected, waiting for connection...');
        setPriceError('Connecting to price feed...');
        return;
      }

      if (solPrice && solPrice > 0) {
        setLastSolPrice(solPrice);
        setPriceError(null);
        console.log('Updated SOL price:', solPrice);
      } else {
        console.warn('Invalid SOL price received:', solPrice);
        setPriceError('Waiting for valid price data...');
      }
    } catch (err) {
      console.error('Error updating SOL price:', err);
      setPriceError('Error updating price data');
    }
  }, [solPrice, isConnected]);

  const createTrade = async (data: {
    type: 'market' | 'limit';
    side: 'buy' | 'sell';
    amount: number;
    price: number;
    walletId: string;
  }): Promise<Trade> => {
    try {
      setLoading(true);
      setError(null);

      if (!lastSolPrice) {
        throw new Error('Cannot create trade: SOL price not available');
      }

      // Create a new trade object
      const newTrade: Trade = {
        id: String(Date.now()),
        timestamp: Date.now(),
        type: data.type,
        side: data.side,
        amount: data.amount,
        price: data.price,
        wallet: data.walletId,
        status: 'completed',
        priceInUsd: data.price * lastSolPrice,
        priceInSol: data.price
      };

      // Update local state
      setTrades(prev => [newTrade, ...prev]);

      // Update order book based on trade type
      if (data.type === 'limit') {
        setOrderBook(prev => {
          const side = data.side === 'buy' ? 'bids' : 'asks';
          return {
            ...prev,
            [side]: [...prev[side], [data.price, data.amount]]
          };
        });
      }

      setLoading(false);
      return newTrade;
    } catch (err) {
      const error = err as Error;
      console.error('Error creating trade:', error);
      setError(error);
      setLoading(false);
      throw error;
    }
  };

  const value: TradingContextType = {
    trades,
    orderBook,
    loading,
    error,
    createTrade,
    lastSolPrice,
    priceError
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

import React, { createContext, useContext, useState, useEffect } from 'react';
import type { Trade, OrderBook } from '../types/trading';
import { usePumpPortalStore } from '@/lib/pump-portal-websocket';

interface TradingContextType {
  trades: Trade[];
  orderBook: OrderBook;
  loading: boolean;
  error: Error | null;
}

export const TradingContext = createContext<TradingContextType>({
  trades: [],
  orderBook: { asks: [], bids: [] },
  loading: true,
  error: null
});

export function TradingProvider({ children }: { children: React.ReactNode }) {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [orderBook, setOrderBook] = useState<OrderBook>({ asks: [], bids: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Get PumpPortal store data
  const token = usePumpPortalStore(state => state.getToken);
  const solPrice = usePumpPortalStore(state => state.solPrice);

  // Update trades when token data changes
  useEffect(() => {
    if (!token) return;

    // Transform PumpPortal trades to our Trade interface format
    const transformedTrades = token.recentTrades?.map(trade => ({
      id: trade.signature,
      price: trade.priceInUsd || 0,
      amount: trade.tokenAmount,
      amountUSD: (trade.tokenAmount * (trade.priceInUsd || 0)),
      amountSOL: trade.solAmount,
      side: trade.type as 'buy' | 'sell',
      timestamp: trade.timestamp,
      wallet: trade.wallet,
      maker: false, // PumpPortal doesn't provide this info
      fee: trade.fee || 0,
      mint: trade.mint
    })) || [];

    setTrades(transformedTrades);
    setLoading(false);
  }, [token]);

  // Update order book when token data changes
  useEffect(() => {
    if (!token) return;

    // Create order book from bonding curve data
    const orderBook: OrderBook = {
      asks: [[token.priceInUsd || 0, token.vTokensInBondingCurve || 0]],
      bids: [[token.priceInUsd || 0, token.vSolInBondingCurve || 0]]
    };

    setOrderBook(orderBook);
  }, [token, solPrice]);

  return (
    <TradingContext.Provider value={{
      trades,
      orderBook,
      loading,
      error
    }}>
      {children}
    </TradingContext.Provider>
  );
}

export function useTradingContext() {
  const context = useContext(TradingContext);
  if (!context) {
    throw new Error('useTradingContext must be used within a TradingProvider');
  }
  return context;
}
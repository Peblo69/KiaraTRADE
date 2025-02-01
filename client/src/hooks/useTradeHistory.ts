import { useState, useEffect, useRef } from 'react';
import { usePumpPortalStore } from '@/lib/pump-portal-websocket';
import { TokenTrade } from '@/types/token';

export function useTradeHistory(tokenAddress: string) {
  const [trades, setTrades] = useState<TokenTrade[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Get PumpPortal data and subscribe to its updates
  const token = usePumpPortalStore(state => state.getToken(tokenAddress));
  const solPrice = usePumpPortalStore(state => state.solPrice);

  // Subscribe to PumpPortal trade updates
  useEffect(() => {
    const unsubscribe = usePumpPortalStore.subscribe((state, prevState) => {
      const currentToken = state.getToken(tokenAddress);
      const prevToken = prevState.getToken(tokenAddress);

      if (currentToken?.recentTrades !== prevToken?.recentTrades) {
        setTrades(currentToken?.recentTrades || []);
      }
    });

    setIsLoading(false);

    return () => unsubscribe();
  }, [tokenAddress]);

  return { trades, isLoading };
}
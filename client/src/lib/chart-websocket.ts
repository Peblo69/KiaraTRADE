import { create } from 'zustand';
import { usePumpPortalStore } from './pump-portal-websocket';
import { Trade } from '@/types/chart';

export const connectToPumpPortal = (tokenAddress: string) => {
  console.log('Connecting to token streams for:', tokenAddress);

  try {
    // Subscribe to PumpPortal updates
    const unsubscribe = usePumpPortalStore.subscribe(
      (state) => state.getToken(tokenAddress),
      (token) => {
        if (!token) {
          console.warn('No token data available:', tokenAddress);
          return;
        }

        const trades = token.recentTrades || [];

        trades.forEach(trade => {
          if (!trade.priceInUsd) {
            console.warn('Trade missing price data:', trade);
            return;
          }

          // Convert SOL price to USD if needed
          const priceInUsd = trade.priceInSol ? trade.priceInSol * token.solPriceUsd : trade.priceInUsd;

          if (!priceInUsd || priceInUsd <= 0) {
            console.warn('Invalid price calculation:', { trade, solPrice: token.solPriceUsd });
            return;
          }

          useChartStore.getState().addTrade(tokenAddress, {
            timestamp: trade.timestamp,
            priceInUsd: priceInUsd,
            amount: trade.amount || 0
          });
        });

        if (trades.length > 0) {
          console.log('Trade batch processed:', {
            token: tokenAddress,
            tradeCount: trades.length,
            priceRange: {
              min: Math.min(...trades.filter(t => t.priceInUsd > 0).map(t => t.priceInUsd)),
              max: Math.max(...trades.filter(t => t.priceInUsd > 0).map(t => t.priceInUsd)),
              latest: trades[trades.length - 1].priceInUsd
            }
          });
        }
      }
    );

    return () => {
      console.log('Disconnecting from token streams for:', tokenAddress);
      unsubscribe();
    };
  } catch (error) {
    console.error('Error connecting to data streams:', error);
    return () => {};
  }
};

interface ChartStore {
  trades: Record<string, Trade[]>;
  addTrade: (tokenAddress: string, trade: Trade) => void;
  getTradesForToken: (tokenAddress: string) => Trade[];
}

export const useChartStore = create<ChartStore>((set, get) => ({
  trades: {},

  addTrade: (tokenAddress: string, trade: Trade) => {
    try {
      // Validate price data
      if (!trade.priceInUsd || trade.priceInUsd <= 0) {
        console.warn('Invalid price, skipping trade:', trade);
        return;
      }

      set((state) => {
        const currentTrades = state.trades[tokenAddress] || [];

        // Add new trade and maintain time order
        const newTrades = [...currentTrades, trade]
          .sort((a, b) => a.timestamp - b.timestamp);

        // Keep last hour of trades
        const cutoffTime = Date.now() - 60 * 60 * 1000;
        const recentTrades = newTrades.filter(t => t.timestamp >= cutoffTime);

        return {
          trades: {
            ...state.trades,
            [tokenAddress]: recentTrades
          }
        };
      });

      console.log('Trade added:', {
        token: tokenAddress,
        price: trade.priceInUsd,
        time: new Date(trade.timestamp).toISOString()
      });
    } catch (error) {
      console.error('Error adding trade:', error);
    }
  },

  getTradesForToken: (tokenAddress: string) => {
    try {
      const trades = get().trades[tokenAddress] || [];
      console.log('Retrieved trades:', {
        token: tokenAddress,
        count: trades.length,
        prices: trades.length > 0 ? {
          first: trades[0].priceInUsd,
          last: trades[trades.length - 1].priceInUsd
        } : null
      });
      return trades;
    } catch (error) {
      console.error('Error getting trades:', error);
      return [];
    }
  }
}));
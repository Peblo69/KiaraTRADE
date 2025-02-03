import { create } from 'zustand';
import { usePumpPortalStore } from '@/lib/pump-portal-websocket';
import { Trade } from './chart-types';

// Initialize connection with PumpPortal
export const connectToPumpPortal = (tokenAddress: string) => {
  console.log('Connecting to PumpPortal for token:', tokenAddress);

  try {
    // Subscribe to token updates from PumpPortal
    const unsubscribe = usePumpPortalStore.subscribe(
      (state) => state.getToken(tokenAddress),
      (token) => {
        if (!token) {
          console.warn('No token data available:', tokenAddress);
          return;
        }

        const trades = token.recentTrades || [];
        console.log(`Processing ${trades.length} trades for token:`, tokenAddress);

        // Process each trade
        trades.forEach(trade => {
          // Validate price data
          if (!trade.priceInUsd || trade.priceInUsd <= 0) {
            console.warn('Invalid price in trade:', trade);
            return;
          }

          // Validate timestamp and amount
          if (!trade.timestamp || !trade.amount || trade.amount <= 0) {
            console.warn('Invalid trade data:', trade);
            return;
          }

          // Add validated trade to chart store
          useChartStore.getState().addTrade(tokenAddress, {
            timestamp: trade.timestamp,
            priceInUsd: trade.priceInUsd,
            amount: trade.amount
          });
        });

        // Log price summary
        if (trades.length > 0) {
          const prices = trades.map(t => t.priceInUsd);
          console.log('Price summary:', {
            token: tokenAddress,
            min: Math.min(...prices),
            max: Math.max(...prices),
            current: prices[prices.length - 1]
          });
        }
      }
    );

    return () => {
      console.log('Disconnecting from PumpPortal for token:', tokenAddress);
      unsubscribe();
    };
  } catch (error) {
    console.error('Error connecting to PumpPortal:', error);
    return () => {}; // Return empty cleanup function
  }
};

// Chart store for managing trade data
interface ChartStore {
  trades: Record<string, Trade[]>;
  addTrade: (tokenAddress: string, trade: Trade) => void;
  getTradesForToken: (tokenAddress: string) => Trade[];
}

export const useChartStore = create<ChartStore>((set, get) => ({
  trades: {},

  addTrade: (tokenAddress: string, trade: Trade) => {
    try {
      // Validate price before adding
      if (!trade.priceInUsd || trade.priceInUsd <= 0) {
        console.warn('Skipping trade with invalid price:', trade);
        return;
      }

      console.log('Processing trade:', {
        token: tokenAddress,
        price: trade.priceInUsd,
        time: new Date(trade.timestamp).toISOString()
      });

      set((state) => {
        const currentTrades = state.trades[tokenAddress] || [];

        // Sort trades by timestamp
        const newTrades = [...currentTrades, trade]
          .sort((a, b) => a.timestamp - b.timestamp);

        // Keep only last hour of trades
        const cutoffTime = Date.now() - 60 * 60 * 1000;
        const recentTrades = newTrades.filter(t => t.timestamp >= cutoffTime);

        return {
          trades: {
            ...state.trades,
            [tokenAddress]: recentTrades
          }
        };
      });
    } catch (error) {
      console.error('Error adding trade:', error);
    }
  },

  getTradesForToken: (tokenAddress: string) => {
    try {
      const trades = get().trades[tokenAddress] || [];
      if (trades.length > 0) {
        // Log price data for debugging
        const prices = trades.map(t => t.priceInUsd);
        console.log('Trade price summary:', {
          token: tokenAddress,
          tradeCount: trades.length,
          minPrice: Math.min(...prices),
          maxPrice: Math.max(...prices),
          latestPrice: prices[prices.length - 1]
        });
      }
      return trades;
    } catch (error) {
      console.error('Error getting trades:', error);
      return [];
    }
  }
}));
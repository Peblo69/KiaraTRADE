import { create } from 'zustand';
import { usePumpPortalStore } from '@/lib/pump-portal-websocket';

interface Trade {
  timestamp: number;
  priceInUsd: number;
  amount: number;
}

interface ChartStore {
  trades: Record<string, Trade[]>;
  addTrade: (tokenAddress: string, trade: Trade) => void;
  getTradesForToken: (tokenAddress: string) => Trade[];
}

export const useChartStore = create<ChartStore>((set, get) => ({
  trades: {},

  addTrade: (tokenAddress: string, trade: Trade) => {
    try {
      console.log('Adding trade to chart store:', { 
        tokenAddress, 
        trade,
        timestamp: new Date(trade.timestamp).toISOString()
      });

      set((state) => {
        const currentTrades = state.trades[tokenAddress] || [];

        // Validate trade data
        if (!trade.timestamp || !trade.priceInUsd || trade.priceInUsd <= 0) {
          console.warn('Invalid trade data:', trade);
          return state;
        }

        const newTrades = [...currentTrades, trade].sort((a, b) => a.timestamp - b.timestamp);

        // Keep only last 60 minutes of trades
        const cutoffTime = Date.now() - 60 * 60 * 1000;
        const filteredTrades = newTrades.filter(t => t.timestamp >= cutoffTime);

        // Log detailed trade information
        console.log('Trade update summary:', {
          tokenAddress,
          totalTradesBeforeFilter: newTrades.length,
          totalTradesAfterFilter: filteredTrades.length,
          oldestTrade: filteredTrades[0] ? new Date(filteredTrades[0].timestamp).toISOString() : null,
          newestTrade: filteredTrades[filteredTrades.length - 1] ? 
            new Date(filteredTrades[filteredTrades.length - 1].timestamp).toISOString() : null,
          priceRange: filteredTrades.length ? {
            min: Math.min(...filteredTrades.map(t => t.priceInUsd)),
            max: Math.max(...filteredTrades.map(t => t.priceInUsd))
          } : null
        });

        return {
          trades: {
            ...state.trades,
            [tokenAddress]: filteredTrades
          }
        };
      });
    } catch (error) {
      console.error('Error adding trade to chart store:', error);
    }
  },

  getTradesForToken: (tokenAddress: string) => {
    try {
      const trades = get().trades[tokenAddress] || [];
      console.log('Getting trades from chart store:', {
        tokenAddress,
        tradeCount: trades.length,
        timeRange: trades.length ? {
          start: new Date(trades[0].timestamp).toISOString(),
          end: new Date(trades[trades.length - 1].timestamp).toISOString()
        } : null
      });
      return trades;
    } catch (error) {
      console.error('Error getting trades from chart store:', error);
      return [];
    }
  }
}));

// Subscribe to PumpPortal store updates
export const initializeChartStore = (tokenAddress: string) => {
  console.log('Initializing chart store for token:', tokenAddress);

  try {
    // Add test data for immediate visualization
    const addTestData = () => {
      const now = Date.now();
      const testTrades = Array.from({ length: 10 }, (_, i) => ({
        timestamp: now - (i * 60 * 1000), // One trade per minute
        priceInUsd: Math.random() * 100,  // Random price between 0-100
        amount: Math.random() * 10        // Random amount between 0-10
      }));

      testTrades.forEach(trade => {
        useChartStore.getState().addTrade(tokenAddress, trade);
      });

      console.log('Added test data to chart store');
    };

    // Subscribe to actual trade data
    const unsubscribe = usePumpPortalStore.subscribe(
      (state) => state.getToken(tokenAddress),
      (token) => {
        if (!token) {
          console.warn('No token data available for:', tokenAddress);
          return;
        }

        if (!token.recentTrades || token.recentTrades.length === 0) {
          console.log('No trades available for token:', tokenAddress);
          // Add test data if no real trades exist
          addTestData();
          return;
        }

        console.log('Processing trades from PumpPortal:', {
          address: tokenAddress,
          tradeCount: token.recentTrades.length,
          tokenPrice: token.priceInUsd
        });

        token.recentTrades.forEach(trade => {
          if (!trade.timestamp || !trade.priceInUsd || !trade.amount) {
            console.warn('Invalid trade data from PumpPortal:', trade);
            return;
          }

          useChartStore.getState().addTrade(tokenAddress, {
            timestamp: trade.timestamp,
            priceInUsd: trade.priceInUsd,
            amount: trade.amount
          });
        });
      }
    );

    return () => {
      console.log('Cleaning up chart store subscription for:', tokenAddress);
      unsubscribe();
    };
  } catch (error) {
    console.error('Error initializing chart store:', error);
    return () => {}; // Return empty cleanup function on error
  }
};
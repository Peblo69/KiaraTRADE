import { create } from 'zustand';
import { Trade } from './chart-types';

interface ChartStore {
  // Store trades by token address
  trades: Record<string, Trade[]>;
  
  // Add a new trade
  addTrade: (tokenAddress: string, trade: Trade) => void;
  
  // Get trades for a token
  getTradesForToken: (tokenAddress: string) => Trade[];
}

export const useChartStore = create<ChartStore>((set, get) => ({
  trades: {},

  addTrade: (tokenAddress: string, trade: Trade) => {
    console.log('Adding trade:', { tokenAddress, price: trade.priceInUsd });
    
    set((state) => {
      const currentTrades = state.trades[tokenAddress] || [];
      
      // Add new trade and sort by timestamp
      const newTrades = [...currentTrades, trade]
        .sort((a, b) => a.timestamp - b.timestamp);
      
      return {
        trades: {
          ...state.trades,
          [tokenAddress]: newTrades
        }
      };
    });
  },

  getTradesForToken: (tokenAddress: string) => {
    return get().trades[tokenAddress] || [];
  }
}));

import { create } from 'zustand';

interface TokenAnalytics {
  topHolders: Array<{
    address: string;
    balance: number;
    percentage: number;
  }>;
  snipers: Array<{
    address: string;
    timestamp: number;
    amount: number;
    type: 'buy' | 'sell';
    profit?: number;
  }>;
  analytics: {
    totalHolders: number;
    averageBalance: number;
    sniperCount: number;
    totalVolume: number;
    rugPullRisk: 'low' | 'medium' | 'high';
  };
}

interface TokenAnalyticsState {
  analytics: Record<string, TokenAnalytics>;
  creationTimes: Record<string, number>;
  updateAnalytics: (tokenAddress: string, data: Partial<TokenAnalytics>) => void;
  setCreationTime: (tokenAddress: string, timestamp: number) => void;
  addSniper: (tokenAddress: string, address: string, amount: number, timestamp: number) => void;
  updateHolder: (tokenAddress: string, address: string, balance: number) => void;
}

export const useTokenAnalyticsStore = create<TokenAnalyticsState>((set, get) => ({
  analytics: {},
  creationTimes: {},
  
  updateAnalytics: (tokenAddress, data) => set((state) => ({
    analytics: {
      ...state.analytics,
      [tokenAddress]: {
        ...state.analytics[tokenAddress],
        ...data
      }
    }
  })),

  setCreationTime: (tokenAddress, timestamp) => set((state) => ({
    creationTimes: {
      ...state.creationTimes,
      [tokenAddress]: timestamp
    }
  })),

  addSniper: (tokenAddress, address, amount, timestamp) => {
    const state = get();
    const creationTime = state.creationTimes[tokenAddress];
    
    // Only add snipers within 30 seconds of creation
    if (creationTime && timestamp - creationTime <= 30000) {
      set((state) => {
        const current = state.analytics[tokenAddress] || {
          topHolders: [],
          snipers: [],
          analytics: { totalHolders: 0, averageBalance: 0, sniperCount: 0 }
        };

        const snipers = [...current.snipers];
        const existingIndex = snipers.findIndex(s => s.address === address);

        if (existingIndex >= 0) {
          snipers[existingIndex].amount += amount;
        } else {
          snipers.push({ address, amount, timestamp });
        }

        // Sort by amount descending
        snipers.sort((a, b) => b.amount - a.amount);

        return {
          analytics: {
            ...state.analytics,
            [tokenAddress]: {
              ...current,
              snipers,
              analytics: {
                ...current.analytics,
                sniperCount: snipers.length
              }
            }
          }
        };
      });
    }
  },

  updateHolder: (tokenAddress, address, balance) => set((state) => {
    const current = state.analytics[tokenAddress] || {
      topHolders: [],
      snipers: [],
      analytics: { totalHolders: 0, averageBalance: 0, sniperCount: 0 }
    };

    // Update or add holder
    const holders = [...current.topHolders];
    const existingIndex = holders.findIndex(h => h.address === address);

    if (existingIndex >= 0) {
      holders[existingIndex].balance = balance;
    } else {
      holders.push({ address, balance, percentage: 0 });
    }

    // Calculate total supply
    const totalSupply = holders.reduce((sum, h) => sum + h.balance, 0);

    // Update percentages and filter for top 10%
    const tenPercentThreshold = totalSupply * 0.1;
    const topHolders = holders
      .map(h => ({
        ...h,
        percentage: (h.balance / totalSupply) * 100
      }))
      .filter(h => h.balance >= tenPercentThreshold)
      .sort((a, b) => b.balance - a.balance);

    return {
      analytics: {
        ...state.analytics,
        [tokenAddress]: {
          ...current,
          topHolders,
          analytics: {
            ...current.analytics,
            totalHolders: holders.length,
            averageBalance: totalSupply / holders.length
          }
        }
      }
    };
  })
}));

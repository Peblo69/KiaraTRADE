import { create } from 'zustand';

interface RugCheckResult {
  score: number;
  risks: {
    name: string;
    value: string;
    description: string;
    score: number;
    level: 'low' | 'medium' | 'high';
  }[];
  mintAuthority: string | null;
  freezeAuthority: string | null;
  topHolders: {
    address: string;
    amount: number;
    pct: number;
    insider: boolean;
  }[];
  markets: {
    liquidityA: string;
    liquidityB: string;
    totalLiquidity: number;
  }[];
}

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

interface TokenAnalyticsStore {
  analytics: Record<string, TokenAnalytics>;
  creationTimes: Record<string, number>;
  updateAnalytics: (tokenAddress: string, data: Partial<TokenAnalytics>) => void;
  setCreationTime: (tokenAddress: string, timestamp: number) => void;
  addSniper: (tokenAddress: string, address: string, amount: number, timestamp: number) => void;
  updateHolder: (tokenAddress: string, address: string, balance: number) => void;
  rugCheck: Record<string, RugCheckResult>;
  performRugCheck: (tokenAddress: string) => Promise<void>;
}

export const useTokenAnalyticsStore = create<TokenAnalyticsStore>((set, get) => ({
  analytics: {},
  creationTimes: {},
  rugCheck: {},

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

    if (creationTime && timestamp - creationTime <= 30000) {
      set((state) => {
        const current = state.analytics[tokenAddress] || {
          topHolders: [],
          snipers: [],
          analytics: { totalHolders: 0, averageBalance: 0, sniperCount: 0, totalVolume: 0, rugPullRisk: 'low' }
        };

        const snipers = [...current.snipers];
        const existingIndex = snipers.findIndex(s => s.address === address);

        if (existingIndex >= 0) {
          snipers[existingIndex].amount += amount;
        } else {
          snipers.push({ address, amount, timestamp, type: 'buy' });
        }

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
      analytics: { totalHolders: 0, averageBalance: 0, sniperCount: 0, totalVolume: 0, rugPullRisk: 'low' }
    };

    const holders = [...current.topHolders];
    const existingIndex = holders.findIndex(h => h.address === address);

    if (existingIndex >= 0) {
      holders[existingIndex].balance = balance;
    } else {
      holders.push({ address, balance, percentage: 0 });
    }

    const totalSupply = holders.reduce((sum, h) => sum + h.balance, 0);
    const topHolders = holders
      .map(h => ({
        ...h,
        percentage: (h.balance / totalSupply) * 100
      }))
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
  }),

  performRugCheck: async (tokenAddress: string) => {
    try {
      console.log(`[Token Analytics] Performing rug check for ${tokenAddress}`);
      const response = await fetch(`/api/token-analytics/${tokenAddress}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch token analytics: ${response.status}`);
      }

      const data = await response.json();
      console.log(`[Token Analytics] Received data:`, data);

      // Get initial data from analytics store
      const analytics = get().analytics[tokenAddress];
      const creationTime = get().creationTimes[tokenAddress];
      const currentTime = Date.now();

      // Calculate critical risk factors based on Solana Sniper logic
      let score = 0;
      const risks: Array<{
        name: string;
        value: string;
        description: string;
        score: number;
        level: 'low' | 'medium' | 'high';
      }> = [];

      // 1. Check Mint Authority - Can new tokens be minted?
      if (data.mintAuthority) {
        score += 30;
        risks.push({
          name: 'Mint Risk',
          value: 'High',
          description: 'Token supply can be increased by mint authority',
          score: 30,
          level: 'high'
        });
      }

      // 2. Check Freeze Authority - Can transfers be frozen?
      if (data.freezeAuthority) {
        score += 20;
        risks.push({
          name: 'Freeze Risk',
          value: 'Medium',
          description: 'Token transfers can be frozen by authority',
          score: 20,
          level: 'medium'
        });
      }

      // 3. Check Top Holder Concentration
      const topHolderPct = data.topHolders?.[0]?.pct || 0;
      if (topHolderPct > 50) {
        score += 25;
        risks.push({
          name: 'Holder Concentration',
          value: 'High',
          description: 'Single wallet holds over 50% of tokens',
          score: 25,
          level: 'high'
        });
      } else if (topHolderPct > 30) {
        score += 15;
        risks.push({
          name: 'Holder Concentration',
          value: 'Medium',
          description: 'Single wallet holds over 30% of tokens',
          score: 15,
          level: 'medium'
        });
      }

      // 4. Check Liquidity Value
      const totalLiquidity = data.markets?.[0]?.totalLiquidity || 0;
      if (totalLiquidity < 1) {
        score += 15;
        risks.push({
          name: 'Low Liquidity',
          value: 'High',
          description: 'Very low liquidity, high price impact on trades',
          score: 15,
          level: 'high'
        });
      }

      // 5. Check Sniper Activity
      const sniperCount = data.analytics?.sniperCount || 0;
      if (sniperCount > 10) {
        score += 10;
        risks.push({
          name: 'High Sniper Activity',
          value: 'Medium',
          description: 'Unusual number of early buyers detected',
          score: 10,
          level: 'medium'
        });
      }

      // 6. Check Token Age
      if (creationTime && (currentTime - creationTime < 3600000)) { // Less than 1 hour old
        score += 10;
        risks.push({
          name: 'New Token',
          value: 'Medium',
          description: 'Token created less than 1 hour ago',
          score: 10,
          level: 'medium'
        });
      }

      // Cap total score at 100
      score = Math.min(score, 100);

      console.log(`[Token Analytics] Calculated rug score: ${score}`);

      set((state) => ({
        rugCheck: {
          ...state.rugCheck,
          [tokenAddress]: {
            score,
            risks,
            mintAuthority: data.mintAuthority,
            freezeAuthority: data.freezeAuthority,
            topHolders: data.topHolders,
            markets: data.markets
          }
        }
      }));

    } catch (error) {
      console.error('[Token Analytics] Rug check failed:', error);
    }
  }
}));
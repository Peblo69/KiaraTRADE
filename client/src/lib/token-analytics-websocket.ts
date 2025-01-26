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
  holders: {
    total: number;
    unique: number;
    top10: Array<{
      address: string;
      balance: number;
      percentage: number;
    }>;
    concentration: {
      top10Percentage: number;
      riskLevel: string;
    };
    distribution: Array<{
      name: string;
      holders: number;
    }>;
  };
  snipers: {
    total: number;
    details: Array<{
      address: string;
      amount: number;
      timestamp: number;
      profit?: number;
    }>;
    volume: number;
    averageAmount: number;
  };
  trading: {
    volume24h: number;
    transactions24h: number;
    averageTradeSize: number;
    priceImpact: number;
  };
  risk: {
    holderConcentration: string;
    sniperActivity: string;
    mintRisk: string;
    overallRisk: {
      score: number;
      level: string;
    };
  };
}

interface TokenAnalyticsStore {
  analytics: Record<string, TokenAnalytics>;
  rugCheck: Record<string, RugCheckResult>;
  performRugCheck: (tokenAddress: string) => Promise<void>;
  updateAnalytics: (tokenAddress: string, data: Partial<TokenAnalytics>) => void;
  addSniper: (tokenAddress: string, address: string, amount: number, timestamp: number) => void;
  updateHolder: (tokenAddress: string, address: string, balance: number) => void;
}

export const useTokenAnalyticsStore = create<TokenAnalyticsStore>((set, get) => ({
  analytics: {},
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

      // Calculate risk factors
      const score = data.risk?.score || 0;
      const risks = data.risk?.risks || [];

      set((state) => ({
        rugCheck: {
          ...state.rugCheck,
          [tokenAddress]: {
            score,
            risks: risks.map((risk: any) => ({
              name: risk.name || risk.type,
              value: risk.level || 'medium',
              description: risk.description || '',
              score: risk.score || 0,
              level: risk.level || 'medium'
            })),
            mintAuthority: data.token?.mintAuthority || null,
            freezeAuthority: data.token?.freezeAuthority || null,
            topHolders: data.holders?.top10?.map((holder: any) => ({
              address: holder.address,
              amount: holder.balance || 0,
              pct: holder.percentage || 0,
              insider: holder.insider || false
            })) || [],
            markets: data.trading ? [{
              liquidityA: data.trading.volume24h?.toString() || "0",
              liquidityB: "0",
              totalLiquidity: data.trading.volume24h || 0
            }] : []
          }
        }
      }));

    } catch (error) {
      console.error('[Token Analytics] Rug check failed:', error);
      throw error;
    }
  }
}));

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
  }),

  performRugCheck: async (tokenAddress: string) => {
    try {
      const response = await fetch(`/api/token-analytics/${tokenAddress}`);
      const data = await response.json();

      const rugScore = calculateRugScore({
        hasUnlockedMint: !!data.mintAuthority,
        hasUnlockedFreeze: !!data.freezeAuthority,
        topHolderConcentration: data.topHolders?.[0]?.pct || 0,
        liquidityValue: data.markets?.reduce((acc, m) => acc + m.totalLiquidity, 0) || 0,
        sniperCount: data.analytics?.sniperCount || 0
      });

      set((state) => ({
        rugCheck: {
          ...state.rugCheck,
          [tokenAddress]: {
            score: rugScore,
            risks: generateRiskReport(rugScore),
            mintAuthority: data.mintAuthority,
            freezeAuthority: data.freezeAuthority,
            topHolders: data.topHolders,
            markets: data.markets
          }
        }
      }));

    } catch (error) {
      console.error('Rug check failed:', error);
    }
  }
}));

function calculateRugScore(factors: {
  hasUnlockedMint: boolean;
  hasUnlockedFreeze: boolean;
  topHolderConcentration: number;
  liquidityValue: number;
  sniperCount: number;
}): number {
  let score = 0;
  
  if (factors.hasUnlockedMint) score += 30;
  if (factors.hasUnlockedFreeze) score += 20;
  if (factors.topHolderConcentration > 50) score += 25;
  if (factors.liquidityValue < 1000) score += 15;
  if (factors.sniperCount > 10) score += 10;

  return Math.min(score, 100);
}

function generateRiskReport(score: number) {
  const risks = [];
  
  if (score >= 75) {
    risks.push({
      name: 'Critical Risk',
      value: 'High rug pull probability',
      description: 'Multiple high-risk factors detected',
      score: score,
      level: 'high'
    });
  } else if (score >= 40) {
    risks.push({
      name: 'Medium Risk',
      value: 'Exercise caution',
      description: 'Some concerning factors present',
      score: score,
      level: 'medium'
    });
  } else {
    risks.push({
      name: 'Low Risk',
      value: 'Basic checks passed',
      description: 'No major red flags detected',
      score: score,
      level: 'low'
    });
  }

  return risks;
}

import { create } from 'zustand';

interface SocialMetrics {
  twitterFollowers?: number;
  twitterMentions24h?: number;
  telegramMembers?: number;
  discordMembers?: number;
  sentiment?: number; // -1 to 1 scale
  lastUpdated?: number;
}

interface TokenSocialMetricsState {
  metrics: Record<string, SocialMetrics>;
  setMetrics: (tokenAddress: string, metrics: SocialMetrics) => void;
  getMetrics: (tokenAddress: string) => SocialMetrics | null;
}

export const useTokenSocialMetricsStore = create<TokenSocialMetricsState>((set, get) => ({
  metrics: {},
  
  setMetrics: (tokenAddress: string, metrics: SocialMetrics) => {
    set((state) => ({
      metrics: {
        ...state.metrics,
        [tokenAddress]: {
          ...metrics,
          lastUpdated: Date.now(),
        },
      },
    }));
  },

  getMetrics: (tokenAddress: string) => {
    return get().metrics[tokenAddress] || null;
  },
}));

// Mock social metrics for development
export const generateMockSocialMetrics = (tokenAddress: string) => {
  const metrics: SocialMetrics = {
    twitterFollowers: Math.floor(Math.random() * 50000),
    twitterMentions24h: Math.floor(Math.random() * 1000),
    telegramMembers: Math.floor(Math.random() * 25000),
    discordMembers: Math.floor(Math.random() * 15000),
    sentiment: (Math.random() * 2 - 1), // Random number between -1 and 1
    lastUpdated: Date.now(),
  };

  useTokenSocialMetricsStore.getState().setMetrics(tokenAddress, metrics);
  return metrics;
};

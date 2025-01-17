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
  updateMetrics: (tokenAddress: string, updates: Partial<SocialMetrics>) => void;
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

  updateMetrics: (tokenAddress: string, updates: Partial<SocialMetrics>) => {
    set((state) => {
      const currentMetrics = state.metrics[tokenAddress];
      if (!currentMetrics) return state;

      return {
        metrics: {
          ...state.metrics,
          [tokenAddress]: {
            ...currentMetrics,
            ...updates,
            lastUpdated: Date.now(),
          },
        },
      };
    });
  },

  getMetrics: (tokenAddress: string) => {
    return get().metrics[tokenAddress] || null;
  },
}));
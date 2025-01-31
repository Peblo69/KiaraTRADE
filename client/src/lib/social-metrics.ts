
import { create } from 'zustand';
import { validateSocialUrl } from '@/utils/social-links';

interface SocialMetrics {
  twitterFollowers?: number;
  twitterMentions24h?: number;
  telegramMembers?: number;
  discordMembers?: number;
  sentiment?: number; // -1 to 1 scale
  lastUpdated?: number;
  links?: {
    website?: string;
    twitter?: string;
    telegram?: string;
    discord?: string;
    medium?: string;
  };
}

interface TokenSocialMetricsState {
  metrics: Record<string, SocialMetrics>;
  setMetrics: (tokenAddress: string, metrics: SocialMetrics) => void;
  getMetrics: (tokenAddress: string) => SocialMetrics | null;
  updateMetrics: (tokenAddress: string, updates: Partial<SocialMetrics>) => void;
  setSocialLinks: (tokenAddress: string, links: Record<string, string>) => void;
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

  setSocialLinks: (tokenAddress: string, links: Record<string, string>) => {
    set((state) => {
      const currentMetrics = state.metrics[tokenAddress] || {};
      const validatedLinks: Record<string, string> = {};

      Object.entries(links).forEach(([key, url]) => {
        const validUrl = validateSocialUrl(url);
        if (validUrl) validatedLinks[key] = validUrl;
      });

      return {
        metrics: {
          ...state.metrics,
          [tokenAddress]: {
            ...currentMetrics,
            links: validatedLinks,
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

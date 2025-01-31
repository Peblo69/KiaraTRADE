import { create } from 'zustand';
import { validateSocialUrl } from '@/utils/validators';
import type { Token } from '@/types/token';

export interface TokenSocialMetrics {
  twitterFollowers?: number;
  telegramMembers?: number;
  lastUpdated?: number;
}

interface SocialMetricsCache {
  [key: string]: {
    metrics: TokenSocialMetrics;
    timestamp: number;
  };
}

interface TokenSocialMetricsState {
  metrics: Record<string, TokenSocialMetrics>;
  setMetrics: (tokenAddress: string, metrics: TokenSocialMetrics) => void;
  getMetrics: (tokenAddress: string) => TokenSocialMetrics | null;
  updateMetrics: (tokenAddress: string, updates: Partial<TokenSocialMetrics>) => void;
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 30;

let requestCounts: { [key: string]: number } = {};
let lastReset = Date.now();
const metricsCache: SocialMetricsCache = {};

export class SocialMetricsService {
  private static isRateLimited(domain: string): boolean {
    const now = Date.now();
    if (now - lastReset > RATE_LIMIT_WINDOW) {
      requestCounts = {};
      lastReset = now;
    }

    requestCounts[domain] = (requestCounts[domain] || 0) + 1;
    return requestCounts[domain] > MAX_REQUESTS_PER_WINDOW;
  }

  private static async fetchWithTimeout(url: string): Promise<string> {
    const domain = new URL(url).hostname;
    if (this.isRateLimited(domain)) {
      throw new Error('Rate limit exceeded');
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return response.text();
    } catch (error) {
      console.error('Fetch error:', error);
      throw error;
    }
  }

  private static extractNumber(text: string): number {
    const match = text.match(/[\d,]+/);
    return match ? parseInt(match[0].replace(/,/g, '')) : 0;
  }

  public static async getSocialMetrics(token: Token): Promise<TokenSocialMetrics> {
    const cacheKey = token.address;
    const cachedData = metricsCache[cacheKey];

    if (cachedData && Date.now() - cachedData.timestamp < CACHE_DURATION) {
      return cachedData.metrics;
    }

    const metrics: TokenSocialMetrics = {
      lastUpdated: Date.now()
    };

    const fetchPromises: Promise<void>[] = [];

    const twitterUrl = token.twitter || token.metadata?.twitter;
    if (twitterUrl) {
      const twitterPromise = (async () => {
        try {
          const validatedUrl = validateSocialUrl(twitterUrl);
          if (validatedUrl) {
            const html = await this.fetchWithTimeout(validatedUrl);
            const followersMatch = html.match(/Followers<\/div><div[^>]*>([^<]*)/i);
            if (followersMatch) {
              metrics.twitterFollowers = this.extractNumber(followersMatch[1]);
            }
          }
        } catch (error) {
          console.error('Twitter metrics error:', error);
        }
      })();
      fetchPromises.push(twitterPromise);
    }

    const telegramUrl = token.telegram || token.metadata?.telegram;
    if (telegramUrl) {
      const telegramPromise = (async () => {
        try {
          const validatedUrl = validateSocialUrl(telegramUrl);
          if (validatedUrl) {
            const html = await this.fetchWithTimeout(validatedUrl);
            const membersMatch = html.match(/Members<\/div><div[^>]*>([^<]*)/i);
            if (membersMatch) {
              metrics.telegramMembers = this.extractNumber(membersMatch[1]);
            }
          }
        } catch (error) {
          console.error('Telegram metrics error:', error);
        }
      })();
      fetchPromises.push(telegramPromise);
    }

    await Promise.allSettled(fetchPromises);

    metricsCache[cacheKey] = {
      metrics,
      timestamp: Date.now()
    };

    return metrics;
  }
}

export const useTokenSocialMetricsStore = create<TokenSocialMetricsState>((set, get) => ({
  metrics: {},

  setMetrics: (tokenAddress: string, metrics: TokenSocialMetrics) => {
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

  updateMetrics: (tokenAddress: string, updates: Partial<TokenSocialMetrics>) => {
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
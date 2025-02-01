import { create } from 'zustand';
import { usePumpPortalStore } from './pump-portal-websocket';
import { useHeliusStore } from './helius-websocket';

interface UnifiedToken {
  // Base data from PumpPortal
  address: string;
  name: string;
  symbol: string;
  imageUrl?: string;
  bondingCurve: {
    key: string;
    vTokens: number;
    vSol: number;
  };
  metadata: {
    name: string;
    symbol: string;
    description?: string;
  };
  devWallet?: string;
  socialLinks?: {
    twitter?: string;
    telegram?: string;
    website?: string;
  };

  // Real-time data from Helius
  realTime: {
    currentPrice: number;
    priceInSol: number;
    volume24h: number;
    trades: Array<{
      signature: string;
      timestamp: number;
      type: 'buy' | 'sell';
      tokenAmount: number;
      solAmount: number;
      priceInSol: number;
      priceInUsd: number;
      traderPublicKey: string;
    }>;
  };
}

interface UnifiedStore {
  tokens: Record<string, UnifiedToken>;
  activeToken: string | null;
  setActiveToken: (address: string | null) => void;
  updateToken: (address: string, updates: Partial<UnifiedToken>) => void;
  getToken: (address: string) => UnifiedToken | undefined;
  isInitialized: boolean;
}

export const useUnifiedStore = create<UnifiedStore>((set, get) => ({
  tokens: {},
  activeToken: null,
  isInitialized: false,

  setActiveToken: (address) => {
    if (address) {
      // Setup subscriptions
      usePumpPortalStore.getState().addToViewedTokens(address);
      useHeliusStore.getState().subscribeToToken(address);
    }
    set({ activeToken: address });
  },

  updateToken: (address, updates) => {
    set(state => ({
      tokens: {
        ...state.tokens,
        [address]: {
          ...(state.tokens[address] || {}),
          ...updates,
        } as UnifiedToken
      }
    }));
  },

  getToken: (address) => get().tokens[address],
}));

// Provide compatibility with old name
export const useUnifiedTokenStore = useUnifiedStore;

// Sync with PumpPortal store
if (typeof window !== 'undefined') {
  // Subscribe to PumpPortal updates
  usePumpPortalStore.subscribe((state) => {
    const store = useUnifiedStore.getState();

    // Sync active token if it exists
    if (store.activeToken) {
      const pumpToken = state.getToken(store.activeToken);
      if (pumpToken) {
        store.updateToken(store.activeToken, {
          address: pumpToken.address,
          name: pumpToken.name,
          symbol: pumpToken.symbol,
          imageUrl: pumpToken.imageUrl,
          bondingCurve: {
            key: pumpToken.bondingCurveKey,
            vTokens: pumpToken.vTokensInBondingCurve,
            vSol: pumpToken.vSolInBondingCurve,
          },
          metadata: {
            name: pumpToken.name,
            symbol: pumpToken.symbol,
            description: pumpToken.description,
          },
          devWallet: pumpToken.devWallet,
          socialLinks: {
            twitter: pumpToken.twitter,
            telegram: pumpToken.telegram,
            website: pumpToken.website,
          },
        });
      }
    }
  });

  // Subscribe to Helius updates
  useHeliusStore.subscribe((state) => {
    const store = useUnifiedStore.getState();

    // Sync active token if it exists
    if (store.activeToken) {
      const heliusData = state.tokenData[store.activeToken];
      if (heliusData) {
        store.updateToken(store.activeToken, {
          realTime: {
            currentPrice: heliusData.lastPrice || 0,
            priceInSol: heliusData.trades?.[0]?.priceInSol || 0,
            volume24h: heliusData.volume24h || 0,
            trades: heliusData.trades || [],
          },
        });
      }
    }
  });
}

// Helper hooks
export function useUnifiedToken(address: string | null) {
  return useUnifiedStore(state => address ? state.tokens[address] : undefined);
}

export function useTokenTrades(address: string | null) {
  return useUnifiedStore(state => address ? state.tokens[address]?.realTime.trades : []);
}

export function useTokenPrice(address: string | null) {
  return useUnifiedStore(state => address ? {
    usd: state.tokens[address]?.realTime.currentPrice || 0,
    sol: state.tokens[address]?.realTime.priceInSol || 0,
  } : { usd: 0, sol: 0 });
}

export function useTokenVolume(address: string | null) {
  return useUnifiedStore(state => address ? state.tokens[address]?.realTime.volume24h || 0 : 0);
}
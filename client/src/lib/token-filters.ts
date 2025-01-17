import { create } from 'zustand';

export type TokenFilterType = 'all' | 'snipers' | 'bluechip' | 'top10' | 'audit';

interface TokenFiltersState {
  activeFilter: TokenFilterType;
  setFilter: (filter: TokenFilterType) => void;
}

export const useTokenFiltersStore = create<TokenFiltersState>((set) => ({
  activeFilter: 'all',
  setFilter: (filter) => set({ activeFilter: filter }),
}));

export const filterTokens = (tokens: any[], filter: TokenFilterType) => {
  switch (filter) {
    case 'snipers':
      // Show newest tokens (less than 24h old)
      return tokens.filter(token => {
        const creationTime = token.lastUpdated || Date.now();
        return Date.now() - creationTime < 24 * 60 * 60 * 1000;
      });
    case 'bluechip':
      // Show tokens with high market cap and volume
      return tokens.filter(token => 
        token.marketCapSol >= 100 && token.volume24h >= 10
      );
    case 'top10':
      // Show top 10 by market cap
      return tokens
        .sort((a, b) => b.marketCapSol - a.marketCapSol)
        .slice(0, 10);
    case 'audit':
      // Show verified/audited tokens
      return tokens.filter(token => token.liquidityAdded);
    default:
      return tokens;
  }
};

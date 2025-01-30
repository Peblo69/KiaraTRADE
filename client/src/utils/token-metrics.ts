
export const THRESHOLDS = {
  LOW_MARKET_CAP: 100,
  MEDIUM_MARKET_CAP: 1000,
  HIGH_MARKET_CAP: 10000
};

export const getRiskLevelColor = (value: number, type: 'marketCap' | 'holders' = 'marketCap') => {
  if (type === 'marketCap') {
    if (value < THRESHOLDS.LOW_MARKET_CAP) return 'text-red-500';
    if (value < THRESHOLDS.MEDIUM_MARKET_CAP) return 'text-yellow-500';
    return 'text-green-500';
  }
  return 'text-gray-500';
};

export const formatMarketCap = (marketCap: number): string => {
  if (marketCap >= 1000000) {
    return `${(marketCap / 1000000).toFixed(2)}M`;
  } else if (marketCap >= 1000) {
    return `${(marketCap / 1000).toFixed(2)}K`;
  }
  return marketCap.toFixed(2);
};

export const calculateMarketCapProgress = (marketCap: number): number => {
  if (marketCap >= THRESHOLDS.HIGH_MARKET_CAP) return 100;
  if (marketCap <= 0) return 0;
  
  const percentage = (marketCap / THRESHOLDS.HIGH_MARKET_CAP) * 100;
  return Math.min(Math.max(percentage, 0), 100);
};

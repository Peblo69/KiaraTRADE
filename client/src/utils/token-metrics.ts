
export const THRESHOLDS = {
  TOP_HOLDERS: 15,
  DEV_WALLET: 15,
  INSIDERS: 10,
  SNIPERS: 5
} as const;

export function getRiskLevelColor(value: number, threshold: number) {
  return value <= threshold
    ? "text-green-400 hover:text-green-300"
    : "text-red-400 hover:text-red-300";
}

export function formatMarketCap(marketCap: number): string {
  if (marketCap >= 1e9) return `$${(marketCap / 1e9).toFixed(2)}B`;
  if (marketCap >= 1e6) return `$${(marketCap / 1e6).toFixed(2)}M`;
  return `$${(marketCap / 1e3).toFixed(2)}K`;
}

export function calculateMarketCapProgress(marketCap: number, maxMarketCap: number = 70000): number {
  return Math.min((marketCap / maxMarketCap) * 100, 100);
}

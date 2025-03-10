/**
 * Utility functions for token metrics calculations and validations
 * Integration Point: These thresholds can be adjusted based on backend requirements
 */

// Holder concentration thresholds
export const THRESHOLDS = {
  TOP_HOLDERS: 15,    // Percentage threshold for top holders (15%)
  DEV_WALLET: 15,    // Percentage threshold for dev wallet (15%)
  INSIDERS: 10,      // Percentage threshold for insiders (10%)
  SNIPERS: 5         // Count threshold for snipers (5)
} as const;

/**
 * Determines the risk level color based on holder concentration
 * @param percentage - The holder concentration percentage
 * @param threshold - The threshold percentage for risk level
 * @returns CSS color classes
 */
export function getRiskLevelColor(value: number, threshold: number) {
  return value <= threshold
    ? "text-green-400 hover:text-green-300"
    : "text-red-400 hover:text-red-300";
}

/**
 * Formats market cap value for display
 * @param marketCap - Market cap value in base units
 * @returns Formatted string with appropriate suffix (K, M, B)
 */
export function formatMarketCap(marketCap: number): string {
  if (marketCap >= 1e9) return `$${(marketCap / 1e9).toFixed(2)}B`;
  if (marketCap >= 1e6) return `$${(marketCap / 1e6).toFixed(2)}M`;
  return `$${(marketCap / 1e3).toFixed(2)}K`;
}

/**
 * Calculates the progress percentage for the market cap bar
 * @param marketCap - Current market cap value
 * @param maxMarketCap - Maximum market cap value for 100%
 * @returns Percentage value (0-100)
 */
export function calculateMarketCapProgress(marketCap: number, maxMarketCap: number = 70000): number {
  return Math.min((marketCap / maxMarketCap) * 100, 100);
}
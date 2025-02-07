import { usePumpPortalStore } from '@/lib/pump-portal-websocket';
import { millify } from 'millify';

interface Thresholds {
  LOW_MCAP: number;
  MED_MCAP: number;
  HIGH_MCAP: number;
  RISK_LOW: number;
  RISK_MED: number;
}

export const THRESHOLDS: Thresholds = {
  LOW_MCAP: 100000,
  MED_MCAP: 500000,
  HIGH_MCAP: 1000000,
  RISK_LOW: 15,
  RISK_MED: 50,
};

interface MarketCapOptions {
  solPrice?: number;
  timestamp?: string;
}

export const formatMarketCap = (
  marketCapSol: number,
  options: MarketCapOptions = {}
): string => {
  if (!marketCapSol || isNaN(marketCapSol)) return '0.00';

  const solPrice = options.solPrice || usePumpPortalStore.getState().solPrice || 100;
  const mcapUsd = Math.abs(marketCapSol * solPrice);

  if (mcapUsd >= 1000000) {
    return millify(mcapUsd, { precision: 2 });
  }
  if (mcapUsd >= 1000) {
    return `${(mcapUsd / 1000).toFixed(2)}K`;
  }
  return mcapUsd.toFixed(2);
};

export const calculateMarketCapProgress = (
  marketCapSol: number,
  options: MarketCapOptions = {}
): number => {
  if (!marketCapSol || isNaN(marketCapSol)) return 0;

  const solPrice = options.solPrice || usePumpPortalStore.getState().solPrice || 100;
  const mcapUsd = marketCapSol * solPrice;

  // More precise progress calculation with smoother transitions
  if (mcapUsd <= THRESHOLDS.LOW_MCAP) {
    return Math.min(33, (mcapUsd / THRESHOLDS.LOW_MCAP) * 33);
  }

  if (mcapUsd <= THRESHOLDS.MED_MCAP) {
    const baseProgress = 33;
    const progressRange = 33;
    const relativeProgress = (mcapUsd - THRESHOLDS.LOW_MCAP) /
      (THRESHOLDS.MED_MCAP - THRESHOLDS.LOW_MCAP);
    return baseProgress + (progressRange * relativeProgress);
  }

  if (mcapUsd <= THRESHOLDS.HIGH_MCAP) {
    const baseProgress = 66;
    const progressRange = 34;
    const relativeProgress = (mcapUsd - THRESHOLDS.MED_MCAP) /
      (THRESHOLDS.HIGH_MCAP - THRESHOLDS.MED_MCAP);
    return baseProgress + (progressRange * relativeProgress);
  }

  return 100;
};

interface RiskLevelStyles {
  text: string;
  bg?: string;
  border?: string;
}

export const getRiskLevelColor = (
  percentage: number,
  includeStyles: boolean = false
): string | RiskLevelStyles => {
  if (!percentage || isNaN(percentage)) return "text-gray-400";

  const styles: RiskLevelStyles = {
    text: percentage <= THRESHOLDS.RISK_LOW ? "text-green-400" :
      percentage <= THRESHOLDS.RISK_MED ? "text-yellow-400" :
        "text-red-400"
  };

  if (includeStyles) {
    styles.bg = percentage <= THRESHOLDS.RISK_LOW ? "bg-green-400/10" :
      percentage <= THRESHOLDS.RISK_MED ? "bg-yellow-400/10" :
        "bg-red-400/10";
    styles.border = percentage <= THRESHOLDS.RISK_LOW ? "border-green-400/20" :
      percentage <= THRESHOLDS.RISK_MED ? "border-yellow-400/20" :
        "border-red-400/20";
  }

  return includeStyles ? styles : styles.text;
};

// Add timestamp-based dynamic thresholds
export const getDynamicThresholds = (timestamp: string = getCurrentUTCTime()): Thresholds => {
  const hour = new Date(timestamp).getUTCHours();
  const isHighActivityPeriod = hour >= 14 && hour <= 22; // 14:00-22:00 UTC

  return {
    ...THRESHOLDS,
    LOW_MCAP: isHighActivityPeriod ? 150000 : 100000,
    MED_MCAP: isHighActivityPeriod ? 750000 : 500000,
    HIGH_MCAP: isHighActivityPeriod ? 1500000 : 1000000,
  };
};

export const getCurrentUTCTime = (): string => {
  return new Date().toISOString();
};
export const THRESHOLDS = {
  LOW_MCAP: 100000,
  MED_MCAP: 500000,
  HIGH_MCAP: 1000000,
  RISK_LOW: 15,
  RISK_MED: 50,
};

export const formatMarketCap = (marketCapSol: number): string => {
  const mcapUsd = marketCapSol * (global.solPrice || 100);
  if (mcapUsd >= 1000000) {
    return `${(mcapUsd / 1000000).toFixed(2)}M`;
  }
  if (mcapUsd >= 1000) {
    return `${(mcapUsd / 1000).toFixed(2)}K`;
  }
  return mcapUsd.toFixed(2);
};

export const calculateMarketCapProgress = (marketCapSol: number): number => {
  const mcapUsd = marketCapSol * (global.solPrice || 100);
  if (mcapUsd <= THRESHOLDS.LOW_MCAP) {
    return (mcapUsd / THRESHOLDS.LOW_MCAP) * 33;
  }
  if (mcapUsd <= THRESHOLDS.MED_MCAP) {
    return 33 + ((mcapUsd - THRESHOLDS.LOW_MCAP) / (THRESHOLDS.MED_MCAP - THRESHOLDS.LOW_MCAP)) * 33;
  }
  if (mcapUsd <= THRESHOLDS.HIGH_MCAP) {
    return 66 + ((mcapUsd - THRESHOLDS.MED_MCAP) / (THRESHOLDS.HIGH_MCAP - THRESHOLDS.MED_MCAP)) * 34;
  }
  return 100;
};

export const getRiskLevelColor = (percentage: number): string => {
  if (percentage <= THRESHOLDS.RISK_LOW) return "text-green-400";
  if (percentage <= THRESHOLDS.RISK_MED) return "text-yellow-400";
  return "text-red-400";
};
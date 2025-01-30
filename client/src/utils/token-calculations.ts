import { TokenTrade, PumpPortalToken } from "@/lib/pump-portal-websocket";

export const calculatePumpFunTokenMetrics = (token: {
  vSolInBondingCurve: number;
  vTokensInBondingCurve: number;
  solPrice: number;
}) => {
  const TOTAL_SUPPLY = 1_000_000_000; // 1 billion fixed supply

  // Price calculation based on bonding curve
  // P = SOL_POOL / (TOTAL_SUPPLY - TOKENS_IN_POOL)
  const priceInSol = token.vTokensInBondingCurve > 0 
    ? token.vSolInBondingCurve / (TOTAL_SUPPLY - token.vTokensInBondingCurve)
    : 0;

  const priceInUsd = priceInSol * token.solPrice;

  // Market cap calculation
  // MC = Current Pool Balance * SOL Price
  const marketCapSol = token.vSolInBondingCurve;
  const marketCapUsd = marketCapSol * token.solPrice;

  return {
    price: {
      sol: priceInSol,
      usd: priceInUsd,
    },
    marketCap: {
      sol: marketCapSol,
      usd: marketCapUsd,
    },
  };
};

export const calculateVolumeMetrics = (trades: TokenTrade[]) => {
  const now = Date.now();
  const oneDayAgo = now - 24 * 60 * 60 * 1000;

  const volume24h = trades
    .filter((trade) => trade.timestamp > oneDayAgo)
    .reduce((sum, trade) => sum + trade.solAmount, 0);

  return {
    volume24h: {
      sol: volume24h,
      usd: volume24h * trades[0]?.priceInUsd || 0,
    },
  };
};

export const calculateTokenRisk = (token: PumpPortalToken) => {
  const holdersRisk = calculateHoldersRisk(token.recentTrades);
  const volumeRisk = calculateVolumeRisk(token.recentTrades);
  const devWalletRisk = calculateDevWalletRisk(token);

  return {
    holdersRisk,
    volumeRisk,
    devWalletRisk,
    totalRisk: (holdersRisk + volumeRisk + devWalletRisk) / 3,
  };
};

// Risk calculation helpers
const calculateHoldersRisk = (trades: TokenTrade[]) => {
  const uniqueTraders = new Set(trades.map((t) => t.traderPublicKey)).size;
  const totalTrades = trades.length;

  // Higher risk if few unique traders relative to total trades
  if (totalTrades === 0) return 100; // Maximum risk if no trades
  const tradeConcentration = uniqueTraders / totalTrades;
  return Math.max(0, 100 - tradeConcentration * 100);
};

const calculateVolumeRisk = (trades: TokenTrade[]) => {
  if (!trades.length) return 100;

  const now = Date.now();
  const oneDayAgo = now - 24 * 60 * 60 * 1000;
  const recentTrades = trades.filter((t) => t.timestamp > oneDayAgo);

  // Calculate volume pattern risk
  const volumePattern = recentTrades.map((t) => t.solAmount);
  const avgVolume = volumePattern.reduce((a, b) => a + b, 0) / volumePattern.length;
  const stdDev = Math.sqrt(
    volumePattern.reduce((sq, n) => sq + Math.pow(n - avgVolume, 2), 0) / volumePattern.length
  );

  // Higher risk if high volume variance (potential manipulation)
  const volumeVariance = stdDev / avgVolume;
  return Math.min(100, volumeVariance * 50);
};

const calculateDevWalletRisk = (token: PumpPortalToken) => {
  if (!token.devWallet) return 50; // Medium risk if no dev wallet identified

  const devTrades = token.recentTrades.filter((t) => t.traderPublicKey === token.devWallet || t.counterpartyPublicKey === token.devWallet);

  if (!devTrades.length) return 25; // Lower risk if dev not actively trading

  // Calculate percentage of trades involving dev wallet
  const devTradePercentage = (devTrades.length / token.recentTrades.length) * 100;

  // Higher risk if dev is involved in high percentage of trades
  return Math.min(100, devTradePercentage * 2);
};
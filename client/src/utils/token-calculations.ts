import { TokenTrade, PumpPortalToken } from "@/lib/pump-portal-websocket";

interface TokenMetrics {
  price: {
    sol: number;
    usd: number;
  };
  marketCap: {
    sol: number;
    usd: number;
  };
}

interface VolumeMetrics {
  volume24h: {
    sol: number;
    usd: number;
  };
}

interface RiskMetrics {
  holdersRisk: number;
  volumeRisk: number;
  devWalletRisk: number;
  insiderRisk: number;
  totalRisk: number;
}

export const calculatePumpFunTokenMetrics = (token: {
  vSolInBondingCurve: number;
  vTokensInBondingCurve: number;
  solPrice: number;
}): TokenMetrics => {
  // Validate inputs
  if (!token.vSolInBondingCurve || !token.vTokensInBondingCurve || !token.solPrice) {
    return {
      price: { sol: 0, usd: 0 },
      marketCap: { sol: 0, usd: 0 }
    };
  }

  const denominator = token.vTokensInBondingCurve;
  if (denominator <= 0) return {
    price: { sol: 0, usd: 0 },
    marketCap: { sol: 0, usd: 0 }
  };

  // Calculate price in SOL and USD
  const priceInSol = token.vSolInBondingCurve / denominator;
  const priceInUsd = priceInSol * token.solPrice;

  // Calculate market cap
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

export const calculateVolumeMetrics = (trades: TokenTrade[]): VolumeMetrics => {
  if (!trades.length) {
    return { volume24h: { sol: 0, usd: 0 } };
  }

  const now = Date.now();
  const oneDayAgo = now - 24 * 60 * 60 * 1000;

  const volume24h = trades
    .filter((trade) => trade.timestamp > oneDayAgo)
    .reduce((sum, trade) => sum + trade.solAmount, 0);

  const latestPrice = trades[0]?.priceInUsd || 0;

  return {
    volume24h: {
      sol: volume24h,
      usd: volume24h * latestPrice,
    },
  };
};

// New risk calculation functions
export const calculateHoldersRisk = (trades: TokenTrade[]): number => {
  const holdersMap = new Map<string, number>();
  trades.forEach(trade => {
    if (trade.txType === 'buy') {
      holdersMap.set(trade.traderPublicKey,
        (holdersMap.get(trade.traderPublicKey) || 0) + trade.tokenAmount);
    } else if (trade.txType === 'sell') {
      holdersMap.set(trade.traderPublicKey,
        Math.max(0, (holdersMap.get(trade.traderPublicKey) || 0) - trade.tokenAmount));
    }
  });

  // Remove zero balances
  Array.from(holdersMap.entries())
    .filter(([_, balance]) => balance <= 0)
    .forEach(([wallet]) => holdersMap.delete(wallet));

  const uniqueHolders = holdersMap.size;

  // Risk levels based on unique holders
  if (uniqueHolders >= 1000) return 0;  // Very low risk
  if (uniqueHolders >= 500) return 25;   // Low risk
  if (uniqueHolders >= 100) return 50;   // Medium risk
  if (uniqueHolders >= 50) return 75;    // High risk
  return 100;                            // Very high risk
};

export const calculateVolumeRisk = (trades: TokenTrade[]): number => {
  const now = Date.now();
  const oneDayAgo = now - 24 * 60 * 60 * 1000;
  const volume24h = trades
    .filter(trade => trade.timestamp > oneDayAgo)
    .reduce((sum, trade) => sum + trade.solAmount, 0);

  // Risk levels based on 24h volume in SOL
  if (volume24h >= 1000) return 0;    // Very low risk
  if (volume24h >= 100) return 25;    // Low risk
  if (volume24h >= 10) return 50;     // Medium risk
  if (volume24h >= 1) return 75;      // High risk
  return 100;                         // Very high risk
};

export const calculateDevWalletRisk = (token: PumpPortalToken): number => {
  if (!token.devWallet) return 50; // Medium risk if no dev wallet identified

  const devTrades = (token.recentTrades || [])
    .filter(trade => trade.traderPublicKey === token.devWallet);

  const sellCount = devTrades.filter(t => t.txType === 'sell').length;
  const totalTrades = devTrades.length;

  if (totalTrades === 0) return 25;  // Low risk if no dev activity

  const sellRatio = sellCount / totalTrades;

  // Risk levels based on dev sell ratio
  if (sellRatio <= 0.1) return 0;     // Very low risk
  if (sellRatio <= 0.25) return 25;   // Low risk
  if (sellRatio <= 0.5) return 50;    // Medium risk
  if (sellRatio <= 0.75) return 75;   // High risk
  return 100;                         // Very high risk
};

const calculateInsiderWallets = (trades: TokenTrade[]): Set<string> => {
  const insiderWallets = new Set<string>();
  const timeWindow = 2000; // 2 seconds window
  const minGroupSize = 4; // Minimum 4 wallets to be considered insider group

  // Group trades by exact timestamp (same second)
  const exactTimeGroups = new Map<number, TokenTrade[]>();
  trades.forEach(trade => {
    if (trade.txType !== 'buy') return;
    const timeKey = Math.floor(trade.timestamp / 1000) * 1000;
    if (!exactTimeGroups.has(timeKey)) {
      exactTimeGroups.set(timeKey, []);
    }
    exactTimeGroups.get(timeKey)!.push(trade);
  });

  // Check for exact time matches (same second buys)
  exactTimeGroups.forEach(groupTrades => {
    if (groupTrades.length >= minGroupSize) {
      groupTrades.forEach(trade => {
        insiderWallets.add(trade.traderPublicKey);
      });
    }
  });

  // Group trades by similar amounts within time windows
  const timeWindowGroups = new Map<number, TokenTrade[]>();
  trades.forEach(trade => {
    if (trade.txType !== 'buy') return;
    const windowKey = Math.floor(trade.timestamp / timeWindow) * timeWindow;
    if (!timeWindowGroups.has(windowKey)) {
      timeWindowGroups.set(windowKey, []);
    }
    timeWindowGroups.get(windowKey)!.push(trade);
  });

  // Check for similar amount patterns
  timeWindowGroups.forEach(windowTrades => {
    if (windowTrades.length < minGroupSize) return;

    // Group by similar amounts (within 10% difference)
    const amountGroups = new Map<number, TokenTrade[]>();
    windowTrades.forEach(trade => {
      let foundGroup = false;
      for (const [amount, group] of amountGroups.entries()) {
        if (Math.abs(trade.solAmount - amount) / amount < 0.1) {
          group.push(trade);
          foundGroup = true;
          break;
        }
      }
      if (!foundGroup) {
        amountGroups.set(trade.solAmount, [trade]);
      }
    });

    // If we find groups of similar amounts with enough wallets
    amountGroups.forEach((group) => {
      if (group.length >= minGroupSize) {
        group.forEach(trade => {
          insiderWallets.add(trade.traderPublicKey);
        });
      }
    });
  });

  return insiderWallets;
};

export const calculateTokenRisk = (token: PumpPortalToken): RiskMetrics => {
  if (!token.recentTrades?.length) {
    return {
      holdersRisk: 100,
      volumeRisk: 100,
      devWalletRisk: 50,
      insiderRisk: 0,
      totalRisk: 83.33
    };
  }

  const holdersRisk = calculateHoldersRisk(token.recentTrades);
  const volumeRisk = calculateVolumeRisk(token.recentTrades);
  const devWalletRisk = calculateDevWalletRisk(token);

  // Calculate insider percentage
  const insiderWallets = calculateInsiderWallets(token.recentTrades);
  const insiderRisk = insiderWallets.size;

  return {
    holdersRisk,
    volumeRisk,
    devWalletRisk,
    insiderRisk,
    totalRisk: (holdersRisk + volumeRisk + devWalletRisk + (insiderRisk * 20)) / 4
  };
};
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
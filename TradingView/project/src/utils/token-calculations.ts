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

interface TokenData {
  vSolInBondingCurve: number;
  vTokensInBondingCurve: number;
  solPrice: number;
}

export function calculatePumpFunTokenMetrics(data: TokenData): TokenMetrics {
  const { vSolInBondingCurve, vTokensInBondingCurve, solPrice } = data;
  
  // Calculate price in SOL and USD
  const priceInSol = vTokensInBondingCurve ? vSolInBondingCurve / vTokensInBondingCurve : 0;
  const priceInUsd = priceInSol * solPrice;
  
  // Calculate market cap in SOL and USD
  const marketCapSol = vSolInBondingCurve;
  const marketCapUsd = marketCapSol * solPrice;
  
  return {
    price: {
      sol: priceInSol,
      usd: priceInUsd
    },
    marketCap: {
      sol: marketCapSol,
      usd: marketCapUsd
    }
  };
}

export function calculateVolumeMetrics(trades: any[]): { volume24h: number } {
  const now = Date.now();
  const oneDayAgo = now - 24 * 60 * 60 * 1000;
  
  const volume24h = trades
    .filter(t => t.timestamp > oneDayAgo)
    .reduce((sum, t) => sum + (t.solAmount || 0), 0);
  
  return { volume24h };
}

export function calculateTokenRisk(token: any) {
  const riskFactors = [];
  let riskScore = 0;
  
  // Check for dev wallet activity
  const devTrades = token.recentTrades.filter((t: any) => t.isDevTrade);
  if (devTrades.length > 0) {
    riskFactors.push({
      type: 'dev_activity',
      score: devTrades.length * 0.1,
      description: 'Dev wallet trading activity detected'
    });
    riskScore += devTrades.length * 0.1;
  }
  
  // Check market cap
  if (token.marketCapSol < 10) {
    riskFactors.push({
      type: 'low_mcap',
      score: 0.3,
      description: 'Very low market cap'
    });
    riskScore += 0.3;
  }
  
  // Check trading volume
  if (token.volume24h < 1) {
    riskFactors.push({
      type: 'low_volume',
      score: 0.2,
      description: 'Low 24h trading volume'
    });
    riskScore += 0.2;
  }
  
  return {
    score: Math.min(riskScore, 1),
    factors: riskFactors
  };
}

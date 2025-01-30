# Token Percentage Calculation Review

## Core Issue: Incorrect Supply Reference
The main issue causing percentages over 100% is in the calculation logic across multiple files:

### 1. TokenCard.tsx (Calculation Logic)
```typescript 
// PROBLEMATIC SECTION: Using wrong denominator for percentage calculations
const calculateTokenMetrics = (
  token: Token,
  trades: TokenTrade[],
  creationTimestamp: number
): TokenMetrics => {
  // ISSUE 1: Using wrong total supply
  const totalSupply = token.vTokensInBondingCurve; // This only represents liquidity tokens!

  // ISSUE 2: Top holders percentage can exceed 100%
  const sortedHolders = Array.from(holdersMap.entries())
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10);
  const top10Supply = sortedHolders.reduce((sum, [_, amount]) => sum + amount, 0);
  const topHoldersPercentage = (top10Supply / totalSupply) * 100;

  // ISSUE 3: Dev wallet percentage can exceed 100%
  const devBalance = holdersMap.get(token.devWallet) || 0;
  const devWalletPercentage = (devBalance / totalSupply) * 100;

  // ISSUE 4: Trade tracking might double count
  const holdersMap = new Map<string, number>();
  trades.forEach(trade => {
    if (trade.txType === 'buy') {
      holdersMap.set(trade.traderPublicKey,
        (holdersMap.get(trade.traderPublicKey) || 0) + trade.tokenAmount);
    } else if (trade.txType === 'sell') {
      holdersMap.set(trade.traderPublicKey,
        (holdersMap.get(trade.traderPublicKey) || 0) - trade.tokenAmount);
    }
  });

  return {
    marketCapSol: token.vSolInBondingCurve,
    volume24h,
    topHoldersPercentage,
    devWalletPercentage,
    snipersCount: snipers.size,
    holdersCount: holdersMap.size
  };
};
```

### 2. pump-portal-websocket.ts (Token Data Store)
```typescript
export interface PumpPortalToken {
  symbol: string;
  name: string;
  address: string;
  bondingCurveKey: string;
  // ISSUE: This is being used as totalSupply incorrectly
  vTokensInBondingCurve: number;  
  vSolInBondingCurve: number;
  marketCapSol: number;
  priceInSol?: number;
  priceInUsd?: number;
  devWallet?: string;
  recentTrades: TokenTrade[];
}

export interface TokenTrade {
  signature: string;
  timestamp: number;
  mint: string;
  txType: 'buy' | 'sell';
  tokenAmount: number;
  solAmount: number;
  traderPublicKey: string;
  counterpartyPublicKey: string;
  bondingCurveKey: string;
  vTokensInBondingCurve: number;
  vSolInBondingCurve: number;
  marketCapSol: number;
  priceInSol: number;
  priceInUsd: number;
  isDevTrade?: boolean;
}
```

## The Core Problems

1. **Wrong Total Supply Reference**
   - Currently using `vTokensInBondingCurve` as total supply
   - This only represents liquidity tokens, not actual circulating supply
   - Results in inflated percentages > 100%

2. **Trade History Issues**
   - Trade tracking might miss burned tokens
   - No accounting for tokens outside the bonding curve
   - Leads to inaccurate holder balances

3. **Overlapping Calculations**
   - Dev wallet can also be in top holders
   - Same tokens counted multiple times
   - No normalization against real supply

## Required Changes

1. **Get Actual Total Supply**
   - Need to fetch actual total supply from token contract
   - Must account for burned/locked tokens
   - Track circulating supply separately from liquidity

2. **Normalize Percentages**
   - Use actual circulating supply as denominator
   - Add validation to ensure percentages cannot exceed 100%
   - Handle edge cases (zero supply, undefined values)

3. **Proper Trade Tracking**
   - Track burned tokens
   - Account for tokens outside bonding curve
   - Implement proper balance validation

Would you like me to suggest specific fixes for any of these issues?

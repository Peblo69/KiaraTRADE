# Problematic Percentage Calculations - Full Code Review

## 1. TokenCard.tsx - Core Issue

The main issue lies in the percentage calculations in the `calculateTokenMetrics` function:

```typescript
// ISSUE: Using wrong denominator for percentages
const totalSupply = token.vTokensInBondingCurve; // This is liquidity tokens, not total supply!

// Top holders percentage calculation
const sortedHolders = Array.from(holdersMap.entries())
  .sort(([, a], [, b]) => b - a)
  .slice(0, 10);

const top10Supply = sortedHolders.reduce((sum, [_, amount]) => sum + amount, 0);
// ISSUE: This can exceed 100% because totalSupply is wrong
const topHoldersPercentage = (top10Supply / totalSupply) * 100;

// Dev wallet percentage
const devBalance = holdersMap.get(token.devWallet) || 0;
// ISSUE: Same problem here with totalSupply
const devWalletPercentage = (devBalance / totalSupply) * 100;

// Full trade tracking logic
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

// Cleanup zero balances
Array.from(holdersMap.entries())
  .filter(([_, balance]) => balance <= 0)
  .forEach(([wallet]) => holdersMap.delete(wallet));
```

## 2. Token Data Structure from pump-portal-websocket.ts

```typescript
export interface PumpPortalToken {
  symbol: string;
  name: string;
  address: string;
  bondingCurveKey: string;
  vTokensInBondingCurve: number;  // ISSUE: This is being used as totalSupply incorrectly
  vSolInBondingCurve: number;
  marketCapSol: number;
  priceInSol?: number;
  priceInUsd?: number;
  devWallet?: string;
  recentTrades: TokenTrade[];
  metadata?: TokenMetadata;
  lastAnalyzedAt?: string;
  analyzedBy?: string;
  createdAt?: string;
  volume24h?: number;
  riskMetrics?: any;
  isNew?: boolean;
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

## 3. Token Metrics Display in TokenCard.tsx

```typescript
// UI Display code showing where percentages appear
<div className="flex items-center gap-2">
  <span>{timeSinceLaunch}</span>
  <button className={cn(
    "flex items-center gap-1 transition-colors",
    getTopHoldersColor(metrics.topHoldersPercentage)
  )}>
    <UserPlus size={13} className="stroke-[2.5]" />
    <span>{metrics.topHoldersPercentage.toFixed(1)}%</span>
  </button>
  {metrics.devWalletPercentage > 0 && (
    <span className={cn(
      "flex items-center gap-1",
      getDevHoldingColor(metrics.devWalletPercentage)
    )}>
      <DevHoldingIcon className="current-color" /> {metrics.devWalletPercentage.toFixed(1)}%
    </span>
  )}
</div>
```

## The Core Problem

1. Using `vTokensInBondingCurve` as total supply is incorrect
2. Need to fetch actual total supply from the token contract
3. Percentages need to be calculated against actual total supply
4. Current calculations can show >100% because they use liquidity tokens as denominator

## Suggested Fix Direction

1. Get actual total supply from token contract metadata
2. Use that as denominator for all percentage calculations
3. Add validation to ensure percentages cannot exceed 100%
4. Consider caching total supply to avoid repeated fetches

Would you like me to provide more specific files or sections for review?

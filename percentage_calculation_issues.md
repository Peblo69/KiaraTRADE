# Token Percentage Calculation Issues

## Current Files Structure and Issues

### 1. TokenCard.tsx - Core Display Component
```typescript
// PROBLEMATIC SECTION - Incorrect Total Supply
const calculateTokenMetrics = (
  token: Token,
  trades: TokenTrade[],
  creationTimestamp: number
): TokenMetrics => {
  // ISSUE: Using wrong total supply! This only counts liquidity tokens
  const totalSupply = token.vTokensInBondingCurve; 

  // ISSUE: Holder map may double count tokens
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

  // ISSUE: Top holders percentage can exceed 100%
  const top10Supply = sortedHolders.reduce((sum, [_, amount]) => sum + amount, 0);
  const topHoldersPercentage = (top10Supply / totalSupply) * 100;

  // ISSUE: Dev wallet percentage can exceed 100%
  const devBalance = holdersMap.get(token.devWallet) || 0;
  const devWalletPercentage = (devBalance / totalSupply) * 100;
}
```

### 2. Token Interface (types/token.ts)
```typescript
export interface Token {
  address: string;
  bondingCurveKey: string;
  vTokensInBondingCurve: number; // ISSUE: This is not total supply!
  vSolInBondingCurve: number;
  marketCapSol: number;
  devWallet?: string;
  recentTrades: TokenTrade[];
}

export interface TokenTrade {
  txType: 'buy' | 'sell';
  tokenAmount: number;
  solAmount: number;
  traderPublicKey: string;
  timestamp: number;
}
```

### 3. pump-portal-websocket.ts Store
```typescript
export const usePumpPortalStore = create<PumpPortalStore>((set, get) => ({
  addToken: (tokenData) => set((state) => {
    // ISSUE: Token supply tracking is incomplete
    const tokenMetrics = calculatePumpFunTokenMetrics({
      vSolInBondingCurve: tokenData.vSolInBondingCurve || 0,
      vTokensInBondingCurve: tokenData.vTokensInBondingCurve || 0,
      solPrice: state.solPrice
    });
  })
}));
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

3. **Missing Correct Supply Data**
   - Need to fetch actual total supply from token contract
   - Should account for burned/locked tokens
   - Need to track circulating supply separately from liquidity

## Suggested Fix Direction

1. Get actual total supply from token contract metadata
2. Track circulating supply separately from bonding curve tokens
3. Normalize all percentages against actual circulating supply
4. Add validation to ensure percentages cannot exceed 100%
5. Consider caching total supply to avoid repeated fetches

## Current Output Examples

As seen in the uploaded images:
- Top holders showing > 100%
- Dev holdings potentially exceeding total supply
- Percentages not properly normalized

Would you like specific sections of any of these files to investigate further?

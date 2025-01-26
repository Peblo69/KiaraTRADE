# Token Security Display Design

## Layout Structure
```jsx
<div className="token-security-panel p-4 bg-card rounded-lg">
  {/* Control Section */}
  <div className="security-row mb-2">
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">🔐 Control</span>
      <div className="flex gap-2">
        <span className="text-xs">Mint: {mintAuth ? '⚠️ Enabled' : '✅ Safe'}</span>
        <span className="text-xs">Freeze: {freezeAuth ? '⚠️ Enabled' : '✅ Safe'}</span>
      </div>
    </div>
  </div>

  {/* Market Health */}
  <div className="security-row mb-2">
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">💰 Liquidity</span>
      <div className="flex gap-2">
        <span className="text-xs">{formatNumber(liquidity)} SOL</span>
        <span className="text-xs">LP: {lpCount}</span>
      </div>
    </div>
  </div>

  {/* Holder Distribution */}
  <div className="security-row mb-2">
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">👥 Holders</span>
      <div className="flex gap-2">
        <span className="text-xs">Top: {topHolderPct}%</span>
        <span className="text-xs">Count: {holderCount}</span>
      </div>
    </div>
  </div>

  {/* Risk Score */}
  <div className="security-row">
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">Risk Score</span>
      <div className="flex items-center gap-2">
        <span className={cn(
          "px-2 py-1 rounded text-xs",
          riskScore > 70 ? "bg-destructive/20 text-destructive" :
          riskScore > 40 ? "bg-yellow-500/20 text-yellow-500" :
          "bg-green-500/20 text-green-500"
        )}>
          {riskScore}/100
          {riskScore > 70 ? '🔴' : riskScore > 40 ? '🟡' : '🟢'}
        </span>
      </div>
    </div>
  </div>
</div>
```

## Color Scheme
- Background: Dark card background (matches your current UI)
- Text: Muted foreground for labels
- Risk Colors:
  - 🔴 High Risk: Red (destructive)
  - 🟡 Medium Risk: Yellow
  - 🟢 Low Risk: Green

## Information Architecture
1. Control & Authority
   - Mint Authority: ✅/⚠️
   - Freeze Authority: ✅/⚠️
   - Visual indicators show safe/risk

2. Liquidity Status
   - Total SOL amount
   - LP Provider count
   - Compact number format

3. Holder Distribution
   - Top holder percentage
   - Total holder count
   - Quick concentration view

4. Risk Score
   - Numerical score /100
   - Color-coded indicator
   - Easy to scan risk level

## Responsive Behavior
- Compact on mobile
- Expandable details on click/hover
- Maintains readability at all sizes
{/* ... other code ... */}

  <div>
    <div className="text-sm text-muted-foreground">💎 Price</div>
    <div className="font-medium">${formatNumber(token.price)}</div>

    {analytics && (
      <TokenDetails analytics={analytics} />
    )}
  </div>

  {/* ... rest of the TokenCard component ... */}
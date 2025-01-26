{/* ... other code ... */}

  <div>
    <div className="text-sm text-muted-foreground">💎 Price</div>
    <div className="font-medium">${formatNumber(token.price)}</div>

    {/* Security button will be re-added with new implementation */}

    {analytics && (
      <TokenDetails analytics={analytics} />
    )}
  </div>

{/* ... rest of the TokenCard component ... */}
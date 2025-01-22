import { useEffect } from 'react';
import { usePumpPortalStore } from "@/lib/pump-portal-websocket";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import TokenChart from './TokenChart';

export function TokenList() {
  const tokens = usePumpPortalStore(state => state.tokens);
  const isConnected = usePumpPortalStore(state => state.isConnected);

  useEffect(() => {
    console.log('[TokenList] Tokens updated:', tokens.length, 'tokens');
    tokens.forEach(token => {
      console.log(`[TokenList] Token ${token.symbol}:`, {
        price: token.price,
        marketCap: token.marketCap,
        trades24h: token.trades24h,
        recentTrades: token.recentTrades.length
      });
    });
  }, [tokens]);

  if (!isConnected) {
    return (
      <Card className="w-full">
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">
            Connecting to PumpPortal...
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!tokens.length) {
    return (
      <Card className="w-full">
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">
            Waiting for new tokens...
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {tokens.map(token => (
          <TokenChart key={token.address} tokenAddress={token.address} />
        ))}
      </div>
    </div>
  );
}

export default TokenList;

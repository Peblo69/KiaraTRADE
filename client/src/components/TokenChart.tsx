import { useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { usePumpPortalStore } from "@/lib/pump-portal-websocket";
import { useHeliusStore } from "@/lib/helius-websocket";
import AdvancedChart from "@/components/AdvancedChart"; // Changed to default import

interface TokenChartProps {
  tokenAddress: string;
}

export function TokenChart({ tokenAddress }: TokenChartProps) {
  const token = usePumpPortalStore(state => 
    state.tokens.find(t => t.address === tokenAddress)
  );

  const metrics = useHeliusStore(state => state.metrics[tokenAddress]);

  const chartData = useMemo(() => {
    if (!metrics?.priceHistory?.length) return [];
    return metrics.priceHistory;
  }, [metrics?.priceHistory]);

  if (!token || !metrics) return null;

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="space-y-1">
          <h3 className="font-semibold text-lg tracking-tight">
            {token.symbol} ({token.name})
          </h3>
          <p className="text-sm text-muted-foreground">
            Current Price: ${metrics.price?.toFixed(8) || '0.00'}
          </p>
        </div>
        <div className="text-right space-y-1">
          <p className="text-sm font-medium">
            Market Cap: ${metrics.marketCap?.toFixed(2) || '0.00'}
          </p>
          <p className="text-sm text-muted-foreground">
            Liquidity: ${metrics.liquidity?.toFixed(2) || '0.00'}
          </p>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          {chartData.length > 0 ? (
            <AdvancedChart
              data={chartData}
              timeframe="1m"
              onTimeframeChange={() => {}}
              symbol={token.symbol}
              className="h-full w-full"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              No price data available
            </div>
          )}
        </div>
        <div className="mt-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span>24h Volume</span>
            <span className="font-medium">
              ${metrics.volume24h?.toFixed(2) || '0.00'}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span>24h Trades</span>
            <span className="font-medium">
              {metrics.trades24h || 0} ({metrics.buys24h || 0} buys, {metrics.sells24h || 0} sells)
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Unique Wallets</span>
            <span className="font-medium">{metrics.walletCount || 0}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default TokenChart;
import { useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { usePumpPortalStore } from "@/lib/pump-portal-websocket";
import { useHeliusStore } from "@/lib/helius-websocket";
import {
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
} from 'recharts';

interface TokenChartProps {
  tokenAddress: string;
}

export function TokenChart({ tokenAddress }: TokenChartProps) {
  const token = usePumpPortalStore(state => 
    state.tokens.find(t => t.address === tokenAddress)
  );

  const heliusTrades = useHeliusStore(state => 
    state.trades[tokenAddress] || []
  );

  // Combine both data sources for richer information
  const chartData = useMemo(() => {
    if (!token) return [];

    // Convert trade history to chart data points
    return token.recentTrades.map(trade => ({
      time: new Date(trade.timestamp).toLocaleTimeString(),
      price: trade.price,
      volume: trade.volume,
      type: trade.isBuy ? 'buy' : 'sell',
      wallet: trade.wallet
    })).reverse();
  }, [token?.recentTrades]);

  useEffect(() => {
    // Debug log for price updates
    if (token) {
      console.log(`[TokenChart] Price update for ${token.symbol}:`, {
        price: token.price,
        marketCap: token.marketCap,
        trades24h: token.trades24h
      });
    }
  }, [token?.price, token?.marketCap, token?.trades24h]);

  if (!token) return null;

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="space-y-1">
          <h3 className="font-semibold text-lg tracking-tight">
            {token.symbol} ({token.name})
          </h3>
          <p className="text-sm text-muted-foreground">
            Current Price: ${token.price.toFixed(8)}
          </p>
        </div>
        <div className="text-right space-y-1">
          <p className="text-sm font-medium" id={`mcap-${tokenAddress}`}>
            Market Cap: ${token.marketCap.toFixed(2)}
          </p>
          <p className="text-sm text-muted-foreground">
            Liquidity: ${token.liquidity.toFixed(2)}
          </p>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="time"
                className="text-xs"
                tickLine={false}
              />
              <YAxis 
                className="text-xs"
                tickLine={false}
                tickFormatter={(value) => `$${value.toFixed(8)}`}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const data = payload[0].payload;
                  return (
                    <div className="rounded-lg border bg-background p-2 shadow-sm">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex flex-col">
                          <span className="text-[0.70rem] uppercase text-muted-foreground">
                            Price
                          </span>
                          <span className="font-bold text-xs">
                            ${data.price.toFixed(8)}
                          </span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[0.70rem] uppercase text-muted-foreground">
                            Volume
                          </span>
                          <span className="font-bold text-xs">
                            ${data.volume.toFixed(2)}
                          </span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[0.70rem] uppercase text-muted-foreground">
                            Type
                          </span>
                          <span className={`font-bold text-xs ${data.type === 'buy' ? 'text-green-500' : 'text-red-500'}`}>
                            {data.type.toUpperCase()}
                          </span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[0.70rem] uppercase text-muted-foreground">
                            Wallet
                          </span>
                          <span className="font-bold text-xs truncate">
                            {data.wallet.slice(0, 8)}...
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                }}
              />
              <Area
                type="monotone"
                dataKey="price"
                stroke="hsl(var(--primary))"
                fillOpacity={1}
                fill="url(#priceGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span>24h Volume</span>
            <span className="font-medium">${token.volume24h.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>24h Trades</span>
            <span className="font-medium">
              {token.trades24h} ({token.buys24h} buys, {token.sells24h} sells)
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Unique Wallets</span>
            <span className="font-medium">{token.walletCount}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default TokenChart;
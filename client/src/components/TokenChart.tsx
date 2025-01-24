
import { useEffect, useMemo } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePumpPortalStore } from "@/lib/pump-portal-websocket";
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

  const chartData = useMemo(() => {
    if (!token) return [];
    return token.recentTrades.map(trade => ({
      time: new Date(trade.timestamp).toLocaleTimeString(),
      price: trade.price,
      volume: trade.volume,
      type: trade.isBuy ? 'buy' : 'sell'
    })).reverse();
  }, [token?.recentTrades]);

  if (!token) return null;

  return (
    <div className="grid grid-cols-[1fr,300px] gap-4">
      <Card className="w-full">
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-2xl font-bold">{token.symbol}</div>
              <div className="text-sm text-muted-foreground">{token.name}</div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">${token.price.toFixed(8)}</div>
              <div className="text-sm text-muted-foreground">Current Price</div>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-4">
            <Card className="p-3">
              <div className="text-sm text-muted-foreground">Market Cap</div>
              <div className="font-bold">${token.marketCap.toFixed(2)}</div>
            </Card>
            <Card className="p-3">
              <div className="text-sm text-muted-foreground">Liquidity</div>
              <div className="font-bold">${token.liquidity.toFixed(2)}</div>
            </Card>
            <Card className="p-3">
              <div className="text-sm text-muted-foreground">Volume (24h)</div>
              <div className="font-bold">${token.volume.toFixed(2)}</div>
            </Card>
            <Card className="p-3">
              <div className="text-sm text-muted-foreground">Holders</div>
              <div className="font-bold">{token.walletCount || 'N/A'}</div>
            </Card>
          </div>
        </div>
        <div className="h-[400px] w-full p-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="time" className="text-xs" />
              <YAxis className="text-xs" tickFormatter={(value) => `$${value.toFixed(8)}`} />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const data = payload[0].payload;
                  return (
                    <Card className="p-2">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <div className="text-xs text-muted-foreground">Price</div>
                          <div className="font-bold">${data.price.toFixed(8)}</div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground">Volume</div>
                          <div className="font-bold">${data.volume.toFixed(2)}</div>
                        </div>
                      </div>
                    </Card>
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
      </Card>

      <Card className="w-full">
        <div className="p-4">
          <Tabs defaultValue="market">
            <TabsList className="grid grid-cols-3 mb-4">
              <TabsTrigger value="market">Market</TabsTrigger>
              <TabsTrigger value="limit">Limit</TabsTrigger>
              <TabsTrigger value="dca">DCA</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="space-y-4">
            <div>
              <div className="text-sm text-muted-foreground mb-2">Amount</div>
              <div className="grid grid-cols-4 gap-2">
                <Button variant="outline" size="sm">0.01</Button>
                <Button variant="outline" size="sm">0.02</Button>
                <Button variant="outline" size="sm">0.5</Button>
                <Button variant="outline" size="sm">1</Button>
              </div>
            </div>

            <Input type="number" placeholder="Enter amount..." />

            <div className="grid grid-cols-2 gap-2">
              <Button className="bg-green-600 hover:bg-green-700">Buy</Button>
              <Button variant="destructive">Sell</Button>
            </div>

            <Button className="w-full" variant="outline">Add Funds</Button>

            <div className="grid grid-cols-3 text-sm">
              <div>
                <div className="text-muted-foreground">Invested</div>
                <div>$0.00</div>
              </div>
              <div>
                <div className="text-muted-foreground">Sold</div>
                <div>$0.00</div>
              </div>
              <div>
                <div className="text-muted-foreground">P/L</div>
                <div className="text-red-500">-0%</div>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

export default TokenChart;

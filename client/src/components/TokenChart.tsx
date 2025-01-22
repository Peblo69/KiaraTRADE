import { FC } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { usePumpPortalStore } from "@/lib/pump-portal-websocket";
import { useHeliusStore } from "@/lib/helius-websocket";
import { FaTwitter, FaTelegram, FaDiscord, FaGlobe } from "react-icons/fa";
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

export const TokenChart: FC<TokenChartProps> = ({ tokenAddress }) => {
  const token = usePumpPortalStore(state => 
    state.tokens.find(t => t.address === tokenAddress)
  );

  const heliusTrades = useHeliusStore(state => 
    state.trades[tokenAddress] || []
  );

  // Prepare chart data from trades
  const chartData = token?.recentTrades.map(trade => ({
    time: new Date(trade.timestamp).toLocaleTimeString(),
    price: trade.price,
    volume: trade.volume,
    type: trade.isBuy ? 'buy' : 'sell',
    wallet: trade.wallet
  })).reverse() || [];

  if (!token) return null;

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-col space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {token.metadata?.image && (
              <img 
                src={token.metadata.image} 
                alt={token.symbol}
                className="w-10 h-10 rounded-full"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            )}
            <div className="space-y-1">
              <h3 className="font-semibold text-lg tracking-tight">
                {token.symbol} {token.metadata?.name && `(${token.metadata.name})`}
              </h3>
              <p className="text-sm text-muted-foreground">
                Current Price: ${token.price.toFixed(8)}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {token.metadata?.socialLinks?.twitter && (
              <Button 
                variant="ghost" 
                size="icon"
                asChild
              >
                <a 
                  href={token.metadata.socialLinks.twitter} 
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  <FaTwitter className="w-4 h-4" />
                </a>
              </Button>
            )}
            {token.metadata?.socialLinks?.telegram && (
              <Button 
                variant="ghost" 
                size="icon"
                asChild
              >
                <a 
                  href={token.metadata.socialLinks.telegram} 
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  <FaTelegram className="w-4 h-4" />
                </a>
              </Button>
            )}
            {token.metadata?.socialLinks?.discord && (
              <Button 
                variant="ghost" 
                size="icon"
                asChild
              >
                <a 
                  href={token.metadata.socialLinks.discord} 
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  <FaDiscord className="w-4 h-4" />
                </a>
              </Button>
            )}
            {token.metadata?.externalUrl && (
              <Button 
                variant="ghost" 
                size="icon"
                asChild
              >
                <a 
                  href={token.metadata.externalUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  <FaGlobe className="w-4 h-4" />
                </a>
              </Button>
            )}
          </div>
        </div>
        <div className="flex justify-between items-center">
          <div className="text-right space-y-1">
            <p className="text-sm font-medium">
              Market Cap: ${token.marketCap.toFixed(2)}
            </p>
            <p className="text-sm text-muted-foreground">
              Liquidity: ${token.liquidity.toFixed(2)}
            </p>
          </div>
        </div>
        {token.metadata?.description && (
          <p className="text-sm text-muted-foreground mt-2">
            {token.metadata.description}
          </p>
        )}
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
};

export default TokenChart;
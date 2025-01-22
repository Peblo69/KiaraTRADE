import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { usePumpPortalStore } from "@/lib/pump-portal-websocket";
import { useHeliusStore } from "@/lib/helius-websocket";
import { FaTwitter, FaTelegram, FaDiscord, FaGlobe } from "react-icons/fa";
import { getTokenMetadata } from "@/lib/token-metadata";
import {
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
} from 'recharts';

interface TokenMetadata {
  name: string;
  symbol: string;
  description?: string;
  image?: string;
  externalUrl?: string;
  socialLinks?: {
    twitter?: string;
    telegram?: string;
    discord?: string;
  };
}

interface TokenChartProps {
  tokenAddress: string;
}

export function TokenChart({ tokenAddress }: TokenChartProps) {
  const [metadata, setMetadata] = useState<TokenMetadata | null>(null);
  const token = usePumpPortalStore(state => 
    state.tokens.find(t => t.address === tokenAddress)
  );

  const heliusTrades = useHeliusStore(state => 
    state.trades[tokenAddress] || []
  );

  // Fetch metadata when token changes
  useEffect(() => {
    if (token?.uri) {
      getTokenMetadata(token.uri)
        .then(meta => {
          if (meta) {
            console.log(`[TokenChart] Loaded metadata for ${token.symbol}:`, meta);
            setMetadata(meta);
          }
        })
        .catch(error => {
          console.error(`[TokenChart] Failed to load metadata for ${token.symbol}:`, error);
        });
    }
  }, [token?.uri]);

  // Combine both data sources for richer information
  const chartData = useMemo(() => {
    if (!token) return [];

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
      <CardHeader className="flex flex-col space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {metadata?.image && (
              <img 
                src={metadata.image} 
                alt={token.symbol}
                className="w-10 h-10 rounded-full"
              />
            )}
            <div className="space-y-1">
              <h3 className="font-semibold text-lg tracking-tight">
                {token.symbol} ({token.name})
              </h3>
              <p className="text-sm text-muted-foreground">
                Current Price: ${token.price.toFixed(8)}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {metadata?.socialLinks?.twitter && (
              <Button 
                variant="ghost" 
                size="icon"
                asChild
              >
                <a 
                  href={metadata.socialLinks.twitter} 
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  <FaTwitter className="w-4 h-4" />
                </a>
              </Button>
            )}
            {metadata?.socialLinks?.telegram && (
              <Button 
                variant="ghost" 
                size="icon"
                asChild
              >
                <a 
                  href={metadata.socialLinks.telegram} 
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  <FaTelegram className="w-4 h-4" />
                </a>
              </Button>
            )}
            {metadata?.socialLinks?.discord && (
              <Button 
                variant="ghost" 
                size="icon"
                asChild
              >
                <a 
                  href={metadata.socialLinks.discord} 
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  <FaDiscord className="w-4 h-4" />
                </a>
              </Button>
            )}
            {metadata?.externalUrl && (
              <Button 
                variant="ghost" 
                size="icon"
                asChild
              >
                <a 
                  href={metadata.externalUrl} 
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
            <p className="text-sm font-medium" id={`mcap-${tokenAddress}`}>
              Market Cap: ${token.marketCap.toFixed(2)}
            </p>
            <p className="text-sm text-muted-foreground">
              Liquidity: ${token.liquidity.toFixed(2)}
            </p>
          </div>
        </div>
        {metadata?.description && (
          <p className="text-sm text-muted-foreground mt-2">
            {metadata.description}
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
}

export default TokenChart;
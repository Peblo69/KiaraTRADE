import '@/lib/pump-portal-websocket';
import '@/lib/helius-websocket';
import { FC, useState, useRef, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, ArrowLeft, TrendingUp, TrendingDown } from "lucide-react";
import { usePumpPortalStore } from "@/lib/pump-portal-websocket";
import { useHeliusStore } from "@/lib/helius-websocket";
import millify from "millify";
import { getTokenImage } from "@/lib/token-metadata";
import { AdvancedChart } from "@/components/AdvancedChart";
import type { TokenData } from "@/types/token";

// Helper functions for formatting numbers
const formatPrice = (price: number | undefined | null): string => {
  if (typeof price !== 'number' || isNaN(price)) return '$0.00';
  return `$${price.toFixed(8)}`;
};

const formatMarketCap = (marketCap: number | undefined | null): string => {
  if (typeof marketCap !== 'number' || isNaN(marketCap)) return '$0';
  return `$${millify(marketCap)}`;
};

function getTimeDiff(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

const TokenRow: FC<{ token: TokenData; onClick: () => void }> = ({ token, onClick }) => {
  const metrics = useHeliusStore(state => state.getTokenMetrics(token.address));

  const handleClick = () => {
    onClick();
    usePumpPortalStore.getState().setTokenActivity(token.address, true);
  };

  // Show loading state if metrics aren't available yet
  if (!metrics) {
    return (
      <Card className="hover:bg-purple-500/5 transition-all duration-300 cursor-pointer group border-purple-500/20">
        <div className="grid grid-cols-[2fr,1fr,1fr,1fr,1fr] gap-4 p-4 items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-purple-500/20 animate-pulse" />
            <div>
              <div className="font-medium group-hover:text-purple-400 transition-colors">
                {token.name}
              </div>
              <div className="text-sm text-muted-foreground">
                {token.symbol}
              </div>
            </div>
          </div>
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-6 bg-purple-500/20 rounded animate-pulse" />
          ))}
        </div>
      </Card>
    );
  }

  // Calculate price change
  const priceChange = metrics.timeWindows['1m']
    ? ((metrics.price - metrics.timeWindows['1m'].openPrice) / metrics.timeWindows['1m'].openPrice) * 100
    : 0;

  return (
    <Card
      key={token.address}
      className="hover:bg-purple-500/5 transition-all duration-300 cursor-pointer group border-purple-500/20"
      onClick={handleClick}
    >
      <div className="grid grid-cols-[2fr,1fr,1fr,1fr,1fr] gap-4 p-4 items-center">
        <div className="flex items-center gap-3">
          <img
            src={getTokenImage(token)}
            alt={`${token.symbol} logo`}
            className="w-10 h-10 rounded-full object-cover bg-purple-500/20"
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'https://via.placeholder.com/150';
            }}
          />
          <div>
            <div className="font-medium group-hover:text-purple-400 transition-colors">
              {token.name}
            </div>
            <div className="text-sm text-muted-foreground">
              {token.symbol}
            </div>
          </div>
        </div>
        <div className={`text-right font-medium ${
          priceChange > 0 ? "text-green-500" : 
          priceChange < 0 ? "text-red-500" : ""
        }`}>
          {formatPrice(metrics.price)}
          {priceChange !== 0 && (
            <span className="text-xs ml-1">
              ({priceChange > 0 ? '+' : ''}{priceChange.toFixed(2)}%)
            </span>
          )}
        </div>
        <div className="text-right">
          {formatMarketCap(metrics.marketCap)}
        </div>
        <div className="text-right">
          {formatMarketCap(metrics.liquidity)}
        </div>
        <div className="text-right">
          {formatMarketCap(metrics.volume24h)}
        </div>
      </div>
    </Card>
  );
};

const TokenView: FC<{ token: TokenData; onBack: () => void }> = ({ token, onBack }) => {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [timeframe, setTimeframe] = useState<'1s' | '5s' | '30s' | '1m' | '5m' | '15m' | '1h'>('1s');
  const metrics = useHeliusStore(state => state.getTokenMetrics(token.address));

  useEffect(() => {
    return () => {
      usePumpPortalStore.getState().setTokenActivity(token.address, false);
    };
  }, [token.address]);

  if (!metrics) {
    return (
      <div className="fixed inset-0 bg-[#0A0A0A] z-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-[#0A0A0A] z-50 overflow-hidden">
      <div className="h-full flex flex-col">
        <div className="border-b border-border/40 bg-[#111111] p-4">
          <div className="max-w-[1400px] mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={onBack}
                className="hover:bg-purple-500/10"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-3">
                <img
                  src={getTokenImage(token)}
                  alt={`${token.symbol} logo`}
                  className="w-8 h-8 rounded-full object-cover bg-purple-500/20"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://via.placeholder.com/150';
                  }}
                />
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-lg font-bold">{token.symbol}</h1>
                    <span className="text-sm text-muted-foreground">{token.name}</span>
                  </div>
                  <div className="text-sm">
                    {formatPrice(metrics.price)}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-8 text-right">
              <div>
                <div className="text-sm text-muted-foreground">Market Cap</div>
                <div className="font-medium">{formatMarketCap(metrics.marketCap)}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Liquidity</div>
                <div className="font-medium">{formatMarketCap(metrics.liquidity)}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Volume 24h</div>
                <div className="font-medium">{formatMarketCap(metrics.volume24h)}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Holders</div>
                <div className="font-medium">{metrics.walletCount}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-hidden">
          <div className="h-full grid grid-cols-[1fr,300px] gap-4 p-4">
            <div className="space-y-4">
              <Card className="bg-[#111111] border-purple-500/20">
                <AdvancedChart
                  data={metrics.priceHistory}
                  timeframe={timeframe}
                  onTimeframeChange={(tf) => setTimeframe(tf as any)}
                  symbol={token.symbol}
                  className="bg-transparent border-0"
                />
              </Card>

              <div className="grid grid-cols-4 gap-4">
                {Object.entries(metrics.timeWindows).map(([window, data]) => (
                  <Card key={window} className="p-4 bg-[#111111] border-purple-500/20">
                    <div className="text-sm text-muted-foreground">{window} Volume</div>
                    <div className="text-lg font-bold mt-1">${millify(data.volume)}</div>
                  </Card>
                ))}
              </div>
            </div>

            <Card className="bg-[#111111] border-purple-500/20">
              <div className="p-4 border-b border-border/40">
                <h3 className="font-semibold">Live Trades</h3>
                <div className="text-xs text-muted-foreground">
                  {metrics.recentTrades.length} trades recorded
                </div>
              </div>
              <ScrollArea className="h-[calc(100vh-180px)]" ref={scrollAreaRef}>
                <div className="p-2 space-y-2">
                  {metrics.recentTrades.map((trade, idx) => (
                    <Card
                      key={`${trade.timestamp}-${idx}`}
                      className={`p-3 flex items-center justify-between ${
                        trade.isBuy
                          ? "bg-green-500/5 border-green-500/20"
                          : "bg-red-500/5 border-red-500/20"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {trade.isBuy ? (
                          <TrendingUp className="h-4 w-4 text-green-500" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-red-500" />
                        )}
                        <div>
                          <div className="text-sm font-medium">
                            {trade.isBuy ? "Buy" : "Sell"}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {trade.wallet.slice(0, 4)}...{trade.wallet.slice(-4)}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">
                          ${trade.volume.toFixed(2)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {getTimeDiff(trade.timestamp)}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

const PumpFunVision: FC = () => {
  const [selectedToken, setSelectedToken] = useState<TokenData | null>(null);
  const tokens = usePumpPortalStore((state) => state.tokens);
  const isConnected = usePumpPortalStore((state) => state.isConnected);

  return (
    <>
      <div className="min-h-screen bg-background">
        <div className="max-w-[1400px] mx-auto p-4">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold">PumpFun Vision</h1>
              <p className="text-sm text-muted-foreground">
                Track newly created tokens and their performance
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="grid grid-cols-[2fr,1fr,1fr,1fr,1fr] gap-4 px-4 py-2 text-sm text-muted-foreground">
              <div>Token</div>
              <div className="text-right">Price</div>
              <div className="text-right">Market Cap</div>
              <div className="text-right">Liquidity</div>
              <div className="text-right">Volume 24h</div>
            </div>

            {!isConnected ? (
              <div className="flex items-center justify-center h-40">
                <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
              </div>
            ) : tokens.length > 0 ? (
              tokens.map((token) => (
                <TokenRow
                  key={token.address}
                  token={token}
                  onClick={() => setSelectedToken(token)}
                />
              ))
            ) : (
              <div className="flex items-center justify-center h-40">
                <p className="text-muted-foreground">Waiting for new tokens...</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {selectedToken && (
        <TokenView
          token={selectedToken}
          onBack={() => {
            setSelectedToken(null);
          }}
        />
      )}
    </>
  );
};

export default PumpFunVision;
import '@/lib/pump-portal-websocket';
import '@/lib/helius-websocket';
import { FC, useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, ArrowLeft, TrendingUp, TrendingDown } from "lucide-react";
import { usePumpPortalStore } from "@/lib/pump-portal-websocket";
import millify from "millify";
import type { PumpPortalToken } from '@/lib/types/pump-portal';
import TradingViewChart from '@/components/TradingViewChart';

function getTimeDiff(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

const TokenRow: FC<{ token: PumpPortalToken; onClick: () => void }> = ({ token, onClick }) => {
  return (
    <Card
      key={token.address}
      className="hover:bg-purple-500/5 transition-all duration-300 cursor-pointer group border-purple-500/20"
      onClick={onClick}
    >
      <div className="grid grid-cols-[2fr,1fr,1fr,1fr,1fr] gap-4 p-4 items-center">
        <div className="flex items-center gap-3">
          <img
            src={token.imageLink || 'https://via.placeholder.com/150'}
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
        <div className={`text-right font-medium ${token.price > token.previousPrice ? "text-green-500" : token.price < token.previousPrice ? "text-red-500" : ""}`}>
          ${token.price.toFixed(6)}
        </div>
        <div className={`text-right ${token.marketCap > token.previousMarketCap ? "text-green-500" : token.marketCap < token.previousMarketCap ? "text-red-500" : ""}`}>
          ${millify(token.marketCap)}
        </div>
        <div className={`text-right ${token.liquidity > token.previousLiquidity ? "text-green-500" : token.liquidity < token.previousLiquidity ? "text-red-500" : ""}`}>
          ${millify(token.liquidity)}
        </div>
        <div className="text-right">
          ${millify(token.volume)}
        </div>
      </div>
    </Card>
  );
};

const TokenView: FC<{ token: PumpPortalToken; onBack: () => void }> = ({ token, onBack }) => {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [allTrades, setAllTrades] = useState<Array<any>>([]);

  const updatedToken = usePumpPortalStore(
    (state) => state.tokens.find((t) => t.address === token.address)
  );

  useEffect(() => {
    if (updatedToken?.recentTrades) {
      setAllTrades(prev => {
        const tradeMap = new Map(
          prev.map(trade => [`${trade.timestamp}-${trade.volume}-${trade.wallet}`, trade])
        );

        updatedToken.recentTrades.forEach(trade => {
          const key = `${trade.timestamp}-${trade.volume}-${trade.wallet}`;
          if (!tradeMap.has(key)) {
            tradeMap.set(key, trade);
          }
        });

        return Array.from(tradeMap.values())
          .sort((a, b) => b.timestamp - a.timestamp);
      });
    }
  }, [updatedToken?.recentTrades]);

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [allTrades.length]);

  const currentToken = updatedToken || token;

  return (
    <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 overflow-auto">
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="border-b border-border/40 p-4">
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
                  src={currentToken.imageLink || 'https://via.placeholder.com/150'}
                  alt={`${currentToken.symbol} logo`}
                  className="w-12 h-12 rounded-full object-cover bg-purple-500/20"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://via.placeholder.com/150';
                  }}
                />
                <div>
                  <h1 className="text-xl font-bold">{currentToken.name}</h1>
                  <p className="text-sm text-muted-foreground">{currentToken.symbol}</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-right">
                <div className={`text-xl font-bold transition-colors duration-300 ${
                  currentToken.price > currentToken.previousPrice ? 'text-green-500' :
                    currentToken.price < currentToken.previousPrice ? 'text-red-500' : ''
                }`}>
                  ${currentToken.price.toFixed(6)}
                </div>
                <div className={currentToken.timeWindows['1m'].closePrice > currentToken.timeWindows['1m'].openPrice ?
                  "text-sm text-green-500" : "text-sm text-red-500"}>
                  {((currentToken.timeWindows['1m'].closePrice - currentToken.timeWindows['1m'].openPrice) /
                    currentToken.timeWindows['1m'].openPrice * 100).toFixed(2)}%
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content - Three Column Layout */}
        <div className="flex-1 overflow-hidden">
          <div className="max-w-[1400px] mx-auto h-full grid grid-cols-[300px,1fr,300px] gap-4 p-4">
            {/* Left Column - Token Info */}
            <div className="space-y-4">
              <Card className="bg-background/50 border-purple-500/20">
                <CardHeader>
                  <h3 className="font-semibold">Token Information</h3>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Market Cap</span>
                      <span className="font-medium">${millify(currentToken.marketCap)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Liquidity</span>
                      <span className="font-medium">${millify(currentToken.liquidity)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Volume 24h</span>
                      <span className="font-medium">${millify(currentToken.volume24h)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-background/50 border-purple-500/20">
                <CardHeader>
                  <h3 className="font-semibold">Trading Stats</h3>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">24h Trades</span>
                      <span className="font-medium">{currentToken.trades24h}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Buys</span>
                      <span className="font-medium text-green-500">{currentToken.buys24h}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Sells</span>
                      <span className="font-medium text-red-500">{currentToken.sells24h}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Unique Wallets</span>
                      <span className="font-medium">{currentToken.walletCount}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Center Column - TradingView Chart */}
            <div className="space-y-4">
              <Card className="bg-background/50 border-purple-500/20">
                <CardHeader>
                  <h3 className="font-semibold">Price Chart</h3>
                </CardHeader>
                <CardContent>
                  <div className="h-[600px]">
                    <TradingViewChart
                      symbol={currentToken.symbol}
                      containerHeight="100%"
                      containerId={`tradingview_${currentToken.address}`}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Time Window Stats */}
              <div className="grid grid-cols-4 gap-4">
                {[
                  { label: "1m Volume", value: `$${millify(currentToken.timeWindows['1m'].volume)}` },
                  { label: "5m Volume", value: `$${millify(currentToken.timeWindows['5m'].volume)}` },
                  { label: "15m Volume", value: `$${millify(currentToken.timeWindows['15m'].volume)}` },
                  { label: "1h Volume", value: `$${millify(currentToken.timeWindows['1h'].volume)}` },
                ].map((stat, idx) => (
                  <Card key={idx} className="p-4 bg-background/50 border-purple-500/20">
                    <div className="text-sm text-muted-foreground">{stat.label}</div>
                    <div className="text-lg font-bold mt-1">{stat.value}</div>
                  </Card>
                ))}
              </div>
            </div>

            {/* Right Column - Live Trades */}
            <Card className="bg-background/50 border-purple-500/20">
              <div className="p-4 border-b border-border/40">
                <h3 className="font-semibold">Live Trades</h3>
                <div className="text-xs text-muted-foreground">
                  {allTrades.length} trades recorded
                </div>
              </div>
              <ScrollArea className="h-[calc(100vh-180px)]" ref={scrollAreaRef}>
                <div className="p-2 space-y-2">
                  {allTrades.map((trade, idx) => (
                    <Card
                      key={`${trade.timestamp}-${idx}`}
                      className={`p-3 flex items-center justify-between ${
                        trade.isBuy
                          ? "bg-green-500/10 border-green-500/20"
                          : "bg-red-500/10 border-red-500/20"
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
  const [selectedToken, setSelectedToken] = useState<PumpPortalToken | null>(null);
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

          {/* Token List */}
          <div className="space-y-2">
            {/* Header */}
            <div className="grid grid-cols-[2fr,1fr,1fr,1fr,1fr] gap-4 px-4 py-2 text-sm text-muted-foreground">
              <div>Token</div>
              <div className="text-right">Price</div>
              <div className="text-right">Market Cap</div>
              <div className="text-right">Liquidity</div>
              <div className="text-right">Volume</div>
            </div>

            {/* Token Rows */}
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

      {/* Token Detail View */}
      {selectedToken && (
        <TokenView
          token={selectedToken}
          onBack={() => setSelectedToken(null)}
        />
      )}
    </>
  );
};

export default PumpFunVision;
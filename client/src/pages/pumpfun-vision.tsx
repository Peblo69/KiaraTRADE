import { FC, useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, ArrowLeft, ArrowUpRight, ArrowDownRight, TrendingUp, TrendingDown } from "lucide-react";
import { usePumpPortalStore } from "@/lib/pump-portal-websocket";
import millify from "millify";

function getTimeDiff(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

const TokenRow: FC<{ token: any; onClick: () => void }> = ({ token, onClick }) => {
  // Track previous values for animations
  const [prevPrice, setPrevPrice] = useState(token.price);
  const [prevMarketCap, setPrevMarketCap] = useState(token.marketCap);
  const [prevLiquidity, setPrevLiquidity] = useState(token.liquidity);

  useEffect(() => {
    const timer = setTimeout(() => {
      setPrevPrice(token.price);
      setPrevMarketCap(token.marketCap);
      setPrevLiquidity(token.liquidity);
    }, 1000);
    return () => clearTimeout(timer);
  }, [token.price, token.marketCap, token.liquidity]);

  const getPriceChangeClass = useCallback((current: number, previous: number) => {
    if (current > previous) return "text-green-500 transition-colors duration-300";
    if (current < previous) return "text-red-500 transition-colors duration-300";
    return "";
  }, []);

  return (
    <Card
      key={token.address}
      className="hover:bg-purple-500/5 transition-all duration-300 cursor-pointer group border-purple-500/20"
      onClick={onClick}
    >
      <div className="grid grid-cols-[2fr,1fr,1fr,1fr,1fr] gap-4 p-4 items-center">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center text-lg font-bold">
            {token.symbol[0]}
          </div>
          <div>
            <div className="font-medium group-hover:text-purple-400 transition-colors">
              {token.name}
            </div>
            <div className="text-sm text-muted-foreground">
              {token.symbol}
            </div>
          </div>
        </div>
        <div className={`text-right font-medium ${getPriceChangeClass(token.price, prevPrice)}`}>
          ${token.price.toFixed(6)}
          {token.price !== prevPrice && (
            <span className="ml-2">
              {token.price > prevPrice ? 
                <TrendingUp className="inline h-4 w-4" /> : 
                <TrendingDown className="inline h-4 w-4" />
              }
            </span>
          )}
        </div>
        <div className={`text-right ${getPriceChangeClass(token.marketCap, prevMarketCap)}`}>
          ${millify(token.marketCap)}
        </div>
        <div className={`text-right ${getPriceChangeClass(token.liquidity, prevLiquidity)}`}>
          ${millify(token.liquidity)}
        </div>
        <div className="text-right">
          ${millify(token.volume)}
        </div>
      </div>
    </Card>
  );
};

const TokenView: FC<{ token: any; onBack: () => void }> = ({ token, onBack }) => {
  // Track previous values for animations
  const [prevPrice, setPrevPrice] = useState(token.price);
  const [prevMarketCap, setPrevMarketCap] = useState(token.marketCap);
  const [prevLiquidity, setPrevLiquidity] = useState(token.liquidity);

  // Update previous values when they change
  useEffect(() => {
    const timer = setTimeout(() => {
      setPrevPrice(token.price);
      setPrevMarketCap(token.marketCap);
      setPrevLiquidity(token.liquidity);
    }, 1000);
    return () => clearTimeout(timer);
  }, [token.price, token.marketCap, token.liquidity]);

  // Calculate change indicators
  const priceChange = token.price - prevPrice;
  const mcapChange = token.marketCap - prevMarketCap;
  const liqChange = token.liquidity - prevLiquidity;

  return (
    <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50">
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="border-b border-border/40 p-4">
          <div className="max-w-[1200px] mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={onBack}
                className="hover:bg-purple-500/10"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-xl font-bold">{token.name}</h1>
                <p className="text-sm text-muted-foreground">{token.symbol}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-right">
                <div className={`text-xl font-bold transition-colors duration-300 ${
                  priceChange > 0 ? 'text-green-500' : 
                  priceChange < 0 ? 'text-red-500' : ''
                }`}>
                  ${token.price.toFixed(6)}
                  {priceChange !== 0 && (
                    <span className="ml-2">
                      {priceChange > 0 ? <TrendingUp className="inline h-4 w-4" /> : 
                       priceChange < 0 ? <TrendingDown className="inline h-4 w-4" /> : null}
                    </span>
                  )}
                </div>
                <div className={token.timeWindows['1m'].closePrice > token.timeWindows['1m'].openPrice ? 
                  "text-sm text-green-500" : "text-sm text-red-500"}>
                  {((token.timeWindows['1m'].closePrice - token.timeWindows['1m'].openPrice) / 
                    token.timeWindows['1m'].openPrice * 100).toFixed(2)}%
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-hidden">
          <div className="max-w-[1200px] mx-auto h-full grid grid-cols-[1fr,300px] gap-4 p-4">
            {/* Left Column - Chart and Stats */}
            <div className="space-y-4">
              {/* Chart placeholder */}
              <Card className="h-[400px] bg-background/50 flex items-center justify-center border-purple-500/20">
                <div className="text-muted-foreground">Chart Coming Soon</div>
              </Card>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-4">
                {[
                  { 
                    label: "Market Cap", 
                    value: `$${millify(token.marketCap)}`,
                    change: mcapChange 
                  },
                  { 
                    label: "Liquidity", 
                    value: `$${millify(token.liquidity)}`,
                    change: liqChange 
                  },
                  { 
                    label: "Volume 24h", 
                    value: `$${millify(token.timeWindows['24h'].volume)}`,
                    change: 0 
                  },
                ].map((stat, idx) => (
                  <Card key={idx} className="p-4 bg-background/50 border-purple-500/20">
                    <div className="text-sm text-muted-foreground">{stat.label}</div>
                    <div className={`text-lg font-bold mt-1 transition-colors duration-300 ${
                      stat.change > 0 ? 'text-green-500' : 
                      stat.change < 0 ? 'text-red-500' : ''
                    }`}>
                      {stat.value}
                      {stat.change !== 0 && (
                        <span className="ml-2">
                          {stat.change > 0 ? <TrendingUp className="inline h-4 w-4" /> : 
                           stat.change < 0 ? <TrendingDown className="inline h-4 w-4" /> : null}
                        </span>
                      )}
                    </div>
                  </Card>
                ))}
              </div>

              {/* Additional Stats */}
              <div className="grid grid-cols-4 gap-4">
                {[
                  { label: "1m Volume", value: `$${millify(token.timeWindows['1m'].volume)}` },
                  { label: "5m Volume", value: `$${millify(token.timeWindows['5m'].volume)}` },
                  { label: "15m Volume", value: `$${millify(token.timeWindows['15m'].volume)}` },
                  { label: "1h Volume", value: `$${millify(token.timeWindows['1h'].volume)}` },
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
              </div>
              <ScrollArea className="h-[calc(100vh-180px)]">
                <div className="p-2 space-y-2">
                  {token.recentTrades.map((trade: any, idx: number) => (
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
                          <ArrowUpRight className="h-4 w-4 text-green-500" />
                        ) : (
                          <ArrowDownRight className="h-4 w-4 text-red-500" />
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
  const [selectedToken, setSelectedToken] = useState<any>(null);
  const tokens = usePumpPortalStore((state) => state.tokens);
  const isConnected = usePumpPortalStore((state) => state.isConnected);

  // Subscribe to token updates for the selected token
  useEffect(() => {
    if (selectedToken) {
      const interval = setInterval(() => {
        const updatedToken = tokens.find(t => t.address === selectedToken.address);
        if (updatedToken) {
          setSelectedToken(updatedToken);
        }
      }, 500);
      return () => clearInterval(interval);
    }
  }, [selectedToken, tokens]);

  return (
    <>
      <div className="min-h-screen bg-background">
        <div className="max-w-[1200px] mx-auto p-4">
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
// FILE: /src/pages/pumpfun-vision.tsx
import '@/lib/unified-websocket';
import { FC, useState, useRef, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useUnifiedTokenStore } from "@/lib/unified-token-store";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, ArrowLeft, TrendingUp, TrendingDown } from "lucide-react";
import { usePumpPortalStore } from "@/lib/pump-portal-websocket";
import millify from "millify";
import { getTokenImage } from "@/lib/token-metadata";
import { AdvancedChart } from "@/components/AdvancedChart";

interface PumpPortalToken {
  address: string;
  name: string;
  symbol: string;
  price: number | undefined | null;
  marketCap: number | undefined | null;
  liquidity: number | undefined | null;
  volume: number | undefined | null;
  volume24h: number;
  trades24h: number;
  buys24h: number;
  sells24h: number;
  walletCount: number;
  timeWindows: {
    '1m': TimeWindow;
    '5m': TimeWindow;
    '15m': TimeWindow;
    '1h': TimeWindow;
  };
  recentTrades: Trade[];
}

interface TimeWindow {
  openPrice: number;
  closePrice: number;
  volume: number;
}

interface Trade {
  timestamp: number;
  price: number;
  volume: number;
  isBuy: boolean;
  wallet: string;
}

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
          token.price > (token.timeWindows['1m']?.openPrice || 0) ? "text-green-500" : 
          token.price < (token.timeWindows['1m']?.openPrice || 0) ? "text-red-500" : ""
        }`}>
          {formatPrice(token.price)}
        </div>
        <div className="text-right">
          {formatMarketCap(token.marketCap)}
        </div>
        <div className="text-right">
          {formatMarketCap(token.liquidity)}
        </div>
        <div className="text-right">
          {formatMarketCap(token.volume)}
        </div>
      </div>
    </Card>
  );
};

const TokenView: FC<{ token: PumpPortalToken; onBack: () => void }> = ({ token, onBack }) => {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [allTrades, setAllTrades] = useState<Trade[]>([]);
  const setActiveToken = useUnifiedTokenStore(state => state.setActiveToken);

  useEffect(() => {
    setActiveToken(token.address);
    return () => setActiveToken(null);
  }, [token.address]);
  const [timeframe, setTimeframe] = useState<'1s' | '5s' | '30s' | '1m' | '5m' | '15m' | '1h'>('1s');

  const updatedToken = usePumpPortalStore(
    (state) => state.tokens.find((t) => t.address === token.address)
  );

  const candleData = useMemo(() => {
    if (!allTrades.length) return [];

    const timeframeMs = {
      '1s': 1000,
      '5s': 5000,
      '30s': 30000,
      '1m': 60 * 1000,
      '5m': 5 * 60 * 1000,
      '15m': 15 * 60 * 1000,
      '1h': 60 * 60 * 1000,
    }[timeframe];

    const candles: any[] = [];
    let currentCandle: any = null;
    let lastPrice = allTrades[0]?.price || 0; // Handle potential undefined

    const calculatePriceImpact = (trade: Trade, basePrice: number) => {
      const impactPercentage = Math.min(trade.volume / 100, 0.01); // Max 1% impact per trade
      return basePrice * (1 + (trade.isBuy ? impactPercentage : -impactPercentage));
    };

    // Sort trades chronologically
    const sortedTrades = [...allTrades].sort((a, b) => a.timestamp - b.timestamp);

    sortedTrades.forEach((trade, index) => {
      const candleTimestamp = Math.floor(trade.timestamp / timeframeMs) * timeframeMs;
      const tradePrice = calculatePriceImpact(trade, lastPrice);

      if (!currentCandle || currentCandle.timestamp !== candleTimestamp) {
        if (currentCandle) {
          candles.push(currentCandle);
        }

        currentCandle = {
          timestamp: candleTimestamp,
          time: Math.floor(candleTimestamp / 1000),
          open: lastPrice,
          high: tradePrice,
          low: tradePrice,
          close: tradePrice,
          volume: trade.volume,
          buyVolume: trade.isBuy ? trade.volume : 0,
          sellVolume: !trade.isBuy ? trade.volume : 0
        };
      } else {
        currentCandle.high = Math.max(currentCandle.high, tradePrice);
        currentCandle.low = Math.min(currentCandle.low, tradePrice);
        currentCandle.close = tradePrice;
        currentCandle.volume += trade.volume;
        if (trade.isBuy) {
          currentCandle.buyVolume += trade.volume;
        } else {
          currentCandle.sellVolume += trade.volume;
        }
      }

      lastPrice = tradePrice;
    });

    if (currentCandle) {
      candles.push(currentCandle);
    }

    return candles;
  }, [allTrades, timeframe]);

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
                  src={getTokenImage(currentToken)}
                  alt={`${currentToken.symbol} logo`}
                  className="w-8 h-8 rounded-full object-cover bg-purple-500/20"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://via.placeholder.com/150';
                  }}
                />
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-lg font-bold">{currentToken.symbol}</h1>
                    <span className="text-sm text-muted-foreground">{currentToken.name}</span>
                  </div>
                  <div className={`text-sm ${
                    currentToken.price > token.price ? 'text-green-500' :
                    currentToken.price < token.price ? 'text-red-500' : ''
                  }`}>
                    {formatPrice(currentToken.price)}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-8 text-right">
              <div>
                <div className="text-sm text-muted-foreground">Market Cap</div>
                <div className="font-medium">{formatMarketCap(currentToken.marketCap)}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Liquidity</div>
                <div className="font-medium">{formatMarketCap(currentToken.liquidity)}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Volume 24h</div>
                <div className="font-medium">{formatMarketCap(currentToken.volume24h)}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Holders</div>
                <div className="font-medium">{currentToken.walletCount}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-hidden">
          <div className="h-full grid grid-cols-[1fr,300px] gap-4 p-4">
            <div className="space-y-4">
              <Card className="bg-[#111111] border-purple-500/20">
                <AdvancedChart
                  data={candleData}
                  timeframe={timeframe}
                  onTimeframeChange={(tf) => setTimeframe(tf as any)}
                  symbol={currentToken.symbol}
                  className="bg-transparent border-0"
                />
              </Card>

              <div className="grid grid-cols-4 gap-4">
                {[
                  { label: "1m Volume", value: `$${millify(currentToken.timeWindows?.['1m']?.volume || 0)}` },
                  { label: "5m Volume", value: `$${millify(currentToken.timeWindows?.['5m']?.volume || 0)}` },
                  { label: "15m Volume", value: `$${millify(currentToken.timeWindows?.['15m']?.volume || 0)}` },
                  { label: "1h Volume", value: `$${millify(currentToken.timeWindows?.['1h']?.volume || 0)}` },
                ].map((stat, idx) => (
                  <Card key={idx} className="p-4 bg-[#111111] border-purple-500/20">
                    <div className="text-sm text-muted-foreground">{stat.label}</div>
                    <div className="text-lg font-bold mt-1">{stat.value}</div>
                  </Card>
                ))}
              </div>
            </div>

            <Card className="bg-[#111111] border-purple-500/20">
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

          <div className="space-y-2">
            <div className="grid grid-cols-[2fr,1fr,1fr,1fr,1fr] gap-4 px-4 py-2 text-sm text-muted-foreground">
              <div>Token</div>
              <div className="text-right">Price</div>
              <div className="text-right">Market Cap</div>
              <div className="text-right">Liquidity</div>
              <div className="text-right">Volume</div>
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
          onBack={() => setSelectedToken(null)}
        />
      )}
    </>
  );
};

export default PumpFunVision;
// FILE: /src/pages/pumpfun-vision.tsx
import '@/lib/pump-portal-websocket';
import '@/lib/helius-websocket';
import { FC, useState, useRef, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, ArrowLeft, TrendingUp, TrendingDown } from "lucide-react";
import { usePumpPortalStore } from "@/lib/pump-portal-websocket";
import millify from "millify";
import { getTokenImage } from "@/lib/token-metadata";
import AdvancedChart from "@/components/AdvancedChart";

interface PumpPortalToken {
  address: string;
  name: string;
  symbol: string;
  price: number;
  marketCap: number;
  liquidity: number;
  volume: number;
  volume24h: number;
  trades24h: number;
  buys24h: number;
  sells24h: number;
  walletCount: number;
  timeWindows: {
    '1s'?: TimeWindow;
    '1m': TimeWindow;
    '5m': TimeWindow;
    '15m': TimeWindow;
    '30m'?: TimeWindow;
    '1h': TimeWindow;
    '4h'?: TimeWindow;
    '1d'?: TimeWindow;
    '1w'?: TimeWindow;
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
        <div className="text-right font-medium">
          ${token.price.toFixed(8)}
        </div>
        <div className="text-right">
          ${millify(token.marketCap)}
        </div>
        <div className="text-right">
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
  const [allTrades, setAllTrades] = useState<Trade[]>([]);
  const [timeframe, setTimeframe] = useState<'1s' | '1m' | '5m' | '15m' | '1h'>('1s');

  const updatedToken = usePumpPortalStore(
    (state) => state.tokens.find((t) => t.address === token.address)
  );

  const candleData = useMemo(() => {
    if (!allTrades.length) return [];

    const timeframeMsMap: Record<string, number> = {
      '1s': 1000,
      '1m': 60 * 1000,
      '5m': 5 * 60 * 1000,
      '15m': 15 * 60 * 1000,
      '1h': 60 * 60 * 1000,
    };

    const timeframeMs = timeframeMsMap[timeframe];
    if (!timeframeMs) return [];

    const candles: {
      time: number;
      open: number;
      high: number;
      low: number;
      close: number;
      volume: number;
    }[] = [];

    let currentCandle: any = null;
    let basePrice = allTrades[0]?.price || 0;

    const sortedTrades = [...allTrades].sort((a, b) => a.timestamp - b.timestamp);

    sortedTrades.forEach((trade) => {
      const candleTimestamp = Math.floor(trade.timestamp / timeframeMs) * timeframeMs;
      const candleTime = Math.floor(candleTimestamp / 1000);

      // Calculate price impact based on volume and direction
      const impact = (trade.volume / 1000) * (trade.isBuy ? 1 : -1);
      const maxImpact = 0.02; // 2% max price impact per trade
      const newPrice = basePrice * (1 + Math.min(Math.abs(impact), maxImpact) * Math.sign(impact));

      if (!currentCandle || currentCandle.time !== candleTime) {
        if (currentCandle) {
          candles.push(currentCandle);
        }

        currentCandle = {
          time: candleTime,
          open: basePrice,
          high: Math.max(basePrice, newPrice),
          low: Math.min(basePrice, newPrice),
          close: newPrice,
          volume: trade.volume,
        };
      } else {
        currentCandle.high = Math.max(currentCandle.high, newPrice);
        currentCandle.low = Math.min(currentCandle.low, newPrice);
        currentCandle.close = newPrice;
        currentCandle.volume += trade.volume;
      }

      basePrice = newPrice;
    });

    if (currentCandle) {
      candles.push(currentCandle);
    }

    return candles;
  }, [allTrades, timeframe]);

  useEffect(() => {
    if (updatedToken?.recentTrades) {
      setAllTrades(prev => {
        const newTrades = [...prev, ...updatedToken.recentTrades];
        const uniqueTrades = Array.from(
          new Map(newTrades.map(trade => [`${trade.timestamp}-${trade.wallet}`, trade])).values()
        );
        return uniqueTrades.slice(-1000);
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
                  <div className="text-sm">
                    ${currentToken.price.toFixed(8)}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-8 text-right">
              <div>
                <div className="text-sm text-muted-foreground">Market Cap</div>
                <div className="font-medium">${millify(currentToken.marketCap)}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Liquidity</div>
                <div className="font-medium">${millify(currentToken.liquidity)}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Volume 24h</div>
                <div className="font-medium">${millify(currentToken.volume24h)}</div>
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
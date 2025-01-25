import { FC, useEffect, useRef, useState, useCallback, memo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePumpPortalStore } from "@/lib/pump-portal-websocket";
import { ArrowLeft, DollarSign, Coins, ChartPie } from "lucide-react";
import { createChart, IChartApi } from 'lightweight-charts';
import { ErrorBoundary } from './ErrorBoundary';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useQuery } from "@tanstack/react-query";

interface TokenChartProps {
  tokenAddress: string;
  onBack: () => void;
}

interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  color?: string;
}

interface TokenAnalytics {
  topHolders: Array<{
    address: string;
    balance: number;
    percentage: number;
  }>;
  snipers: Array<{
    address: string;
    timestamp: number;
    amount: number;
  }>;
  insiders: Array<{
    address: string;
    interactions: number;
  }>;
  analytics: {
    totalHolders: number;
    averageBalance: number;
    sniperCount: number;
    insiderCount: number;
  };
}

const TokenChartContent: FC<TokenChartProps> = memo(({ tokenAddress, onBack }) => {
  const [showAnalytics, setShowAnalytics] = useState(false);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const isMountedRef = useRef(true);
  const lastViewRangeRef = useRef<{ from: number; to: number } | null>(null);
  const [showUsd, setShowUsd] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const token = usePumpPortalStore(
    useCallback(state => state.tokens.find(t => t.address === tokenAddress), [tokenAddress])
  );
  const solPrice = usePumpPortalStore(state => state.solPrice);
  const devWallet = token?.devWallet;

  const cleanupChart = useCallback(() => {
    if (resizeObserverRef.current && chartContainerRef.current) {
      resizeObserverRef.current.disconnect();
      resizeObserverRef.current = null;
    }
    if (chartRef.current) {
      const timeScale = chartRef.current.timeScale();
      const visibleRange = timeScale.getVisibleLogicalRange();
      if (visibleRange) {
        lastViewRangeRef.current = visibleRange;
      }
      chartRef.current.remove();
      chartRef.current = null;
    }
  }, []);

  const formatPriceScale = (price: number): string => {
    if (price >= 1000000) return `${(price / 1000000).toFixed(1)}M`;
    if (price >= 1000) return `${(price / 1000).toFixed(1)}K`;
    return price.toFixed(2);
  };

  const initializeChart = useCallback(() => {
    if (!chartContainerRef.current || !token?.recentTrades?.length) return;

    cleanupChart();

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { color: '#000000' },
        textColor: '#666666',
      },
      grid: {
        vertLines: { color: '#1a1a1a' },
        horzLines: { color: '#1a1a1a' },
      },
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
      rightPriceScale: {
        borderColor: '#333333',
        scaleMargins: {
          top: 0.1,
          bottom: 0.1,
        },
        mode: 1,
        autoScale: true,
        formatter: formatPriceScale,
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: true,
        borderColor: '#333333',
        rightOffset: 12,
        barSpacing: 12,
      },
    });

    chartRef.current = chart;

    const candlestickSeries = chart.addCandlestickSeries({
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderUpColor: '#22c55e',
      borderDownColor: '#ef4444',
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444',
    });

    const generateCandles = () => {
      const candles: Candle[] = [];
      let prevPrice = token.marketCapSol * solPrice;
      let lastTimestamp = 0;
      let offset = 0;

      // Sort trades by timestamp ascending
      const sortedTrades = [...token.recentTrades].sort((a, b) => a.timestamp - b.timestamp);

      sortedTrades.forEach(trade => {
        const currentPrice = trade.marketCapSol * solPrice;
        let tradeTime = Math.floor(trade.timestamp / 1000);

        // Add offset for trades in the same second
        if (tradeTime === lastTimestamp) {
          offset += 1;
        } else {
          offset = 0;
          lastTimestamp = tradeTime;
        }

        // Add millisecond offset to ensure unique timestamps
        tradeTime = tradeTime + (offset * 0.001);

        const candle: Candle = {
          time: tradeTime,
          open: trade.txType === 'buy' ? prevPrice : currentPrice,
          close: trade.txType === 'buy' ? currentPrice : prevPrice,
          high: Math.max(prevPrice, currentPrice),
          low: Math.min(prevPrice, currentPrice),
          color: trade.txType === 'buy' ? '#22c55e' : '#ef4444'
        };

        candles.push(candle);
        prevPrice = currentPrice;
      });

      return candles;
    };

    const candles = generateCandles();

    if (candles.length > 0) {
      candlestickSeries.setData(candles);

      if (!lastViewRangeRef.current) {
        chart.timeScale().fitContent();
      } else {
        chart.timeScale().setVisibleLogicalRange(lastViewRangeRef.current);
      }
    }

    const resizeObserver = new ResizeObserver(entries => {
      if (!chartRef.current || !isMountedRef.current) return;
      const { width, height } = entries[0].contentRect;
      requestAnimationFrame(() => {
        if (chartRef.current && isMountedRef.current) {
          chartRef.current.applyOptions({ width, height });
        }
      });
    });

    if (chartContainerRef.current) {
      resizeObserver.observe(chartContainerRef.current);
      resizeObserverRef.current = resizeObserver;
    }

  }, [token?.recentTrades, cleanupChart, solPrice]);

  useEffect(() => {
    isMountedRef.current = true;
    initializeChart();
    return () => {
      isMountedRef.current = false;
      cleanupChart();
    };
  }, [token?.recentTrades, initializeChart, cleanupChart]);

  const formatPrice = (value: number) => {
    if (!value || isNaN(value)) return showUsd ? '$0.00' : '0 SOL';
    return showUsd
      ? `$${(value).toFixed(2)}`
      : `${value.toFixed(9)} SOL`;
  };

  const formatAddress = (address: string) =>
    `${address.slice(0, 6)}...${address.slice(-4)}`;

  const formatPercentage = (value: number) =>
    `${value.toFixed(2)}%`;


  const formatTimestamp = (timestamp: number) =>
    new Date(timestamp).toLocaleString();

  // Fetch token analytics
  const { data: analytics, isLoading: isLoadingAnalytics } = useQuery<TokenAnalytics>({
    queryKey: [`/api/token-analytics/${tokenAddress}`],
    enabled: showAnalytics,
  });

  if (!token) return null;

  if (error) {
    return (
      <div className="p-4 bg-black/90 text-white rounded-lg">
        <h3 className="text-lg font-semibold mb-2">Chart Error</h3>
        <p className="text-sm text-gray-400">{error.message}</p>
        <Button
          onClick={() => {
            setError(null);
            cleanupChart();
            initializeChart();
          }}
          className="mt-4"
        >
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="flex-1 h-screen bg-black text-white">
      <div className="absolute top-4 left-4 z-10 flex items-center gap-4">
        <Button
          variant="ghost"
          className="text-white hover:bg-white/10"
          onClick={onBack}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <Dialog>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              className="bg-purple-500/20 border-purple-500/50 hover:bg-purple-500/30"
              onClick={() => setShowAnalytics(true)}
            >
              <ChartPie className="h-4 w-4 mr-2" />
              Analytics
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl bg-black/95 text-white border-purple-500/20">
            <DialogHeader>
              <DialogTitle>Token Analytics</DialogTitle>
              <DialogDescription>
                Advanced analytics and holder information
              </DialogDescription>
            </DialogHeader>

            {isLoadingAnalytics ? (
              <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-purple-500"></div>
              </div>
            ) : analytics ? (
              <div className="space-y-6">
                {/* Overview Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-purple-500/10 rounded-lg p-4">
                    <div className="text-sm text-gray-400">Total Holders</div>
                    <div className="text-xl font-bold">{analytics.analytics.totalHolders}</div>
                  </div>
                  <div className="bg-purple-500/10 rounded-lg p-4">
                    <div className="text-sm text-gray-400">Avg Balance</div>
                    <div className="text-xl font-bold">{analytics.analytics.averageBalance.toFixed(2)}</div>
                  </div>
                  <div className="bg-purple-500/10 rounded-lg p-4">
                    <div className="text-sm text-gray-400">Snipers</div>
                    <div className="text-xl font-bold">{analytics.analytics.sniperCount}</div>
                  </div>
                  <div className="bg-purple-500/10 rounded-lg p-4">
                    <div className="text-sm text-gray-400">Insiders</div>
                    <div className="text-xl font-bold">{analytics.analytics.insiderCount}</div>
                  </div>
                </div>

                {/* Top Holders */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Top Holders</h3>
                  <div className="space-y-2">
                    {analytics.topHolders.map((holder, idx) => (
                      <div
                        key={holder.address}
                        className="flex items-center justify-between p-2 bg-purple-500/5 rounded-lg hover:bg-purple-500/10 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-purple-400">#{idx + 1}</span>
                          <a
                            href={`https://solscan.io/account/${holder.address}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:underline"
                          >
                            {formatAddress(holder.address)}
                          </a>
                        </div>
                        <div className="text-right">
                          <div>{formatPercentage(holder.percentage)}</div>
                          <div className="text-sm text-gray-400">{holder.balance.toFixed(2)} tokens</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Snipers */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Early Buyers (Snipers)</h3>
                  <div className="space-y-2">
                    {analytics.snipers.map((sniper) => (
                      <div
                        key={sniper.address}
                        className="flex items-center justify-between p-2 bg-amber-500/5 rounded-lg hover:bg-amber-500/10 transition-colors"
                      >
                        <a
                          href={`https://solscan.io/account/${sniper.address}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:underline"
                        >
                          {formatAddress(sniper.address)}
                        </a>
                        <div className="text-right">
                          <div>{sniper.amount.toFixed(2)} tokens</div>
                          <div className="text-sm text-gray-400">{formatTimestamp(sniper.timestamp)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Insiders */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Insider Activity</h3>
                  <div className="space-y-2">
                    {analytics.insiders.map((insider) => (
                      <div
                        key={insider.address}
                        className="flex items-center justify-between p-2 bg-orange-500/5 rounded-lg hover:bg-orange-500/10 transition-colors"
                      >
                        <a
                          href={`https://solscan.io/account/${insider.address}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:underline"
                        >
                          {formatAddress(insider.address)}
                        </a>
                        <div>
                          <div>{insider.interactions} interactions</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                Failed to load analytics data
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      <div className="p-4">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <img
              src={token.imageLink || 'https://via.placeholder.com/150'}
              className="w-8 h-8 rounded-full"
              alt={token.symbol}
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://via.placeholder.com/150';
              }}
            />
            <div>
              <h2 className="text-2xl font-bold">{token.symbol}</h2>
              <div className="text-sm text-gray-400">
                {formatAddress(token.address)}
              </div>
            </div>
          </div>

          <div className="flex gap-6">
            <div className="text-right">
              <div className="text-sm text-gray-400">Price</div>
              <div className="font-bold">{formatPrice(token.marketCapSol * solPrice)}</div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-400">Liquidity</div>
              <div className="font-bold">{formatPrice(token.vSolInBondingCurve * solPrice)}</div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-400">Market Cap</div>
              <div className="font-bold">{formatPriceScale(token.marketCapSol * solPrice)}</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-[1fr,300px] gap-4">
          <div className="space-y-4">
            <div className="h-[500px] bg-[#111] rounded-lg">
              <div className="p-4">
                <div ref={chartContainerRef} className="h-[450px]" />
              </div>
            </div>

            <div className="bg-[#111] rounded-lg p-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-semibold">Recent Trades</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowUsd(!showUsd)}
                  className="text-xs"
                >
                  {showUsd ? <DollarSign className="h-4 w-4" /> : <Coins className="h-4 w-4" />}
                </Button>
              </div>

              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {token.recentTrades?.map((trade, idx) => {
                  const isDevWallet = trade.traderPublicKey === devWallet ||
                    trade.counterpartyPublicKey === devWallet;
                  const isDevBuying = isDevWallet && trade.traderPublicKey === devWallet && trade.txType === 'buy';
                  const isDevSelling = isDevWallet && (
                    (trade.traderPublicKey === devWallet && trade.txType === 'sell') ||
                    (trade.counterpartyPublicKey === devWallet && trade.txType === 'buy')
                  );

                  return (
                    <div
                      key={trade.signature || idx}
                      className={`flex items-center justify-between p-2 rounded bg-black/20 text-sm ${
                        isDevWallet ?
                          isDevBuying ? 'text-amber-400' : 'text-orange-500' :
                          trade.txType === 'buy' ? 'text-green-500' : 'text-red-500'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span>{formatTimestamp(trade.timestamp)}</span>
                        <span>
                          {formatAddress(trade.traderPublicKey)}
                          {isDevWallet && (
                            <span className={`ml-1 text-xs px-1 rounded ${
                              isDevBuying ? 'bg-amber-400/20 text-amber-400' : 'bg-orange-500/20 text-orange-500'
                            }`}>
                              DEV
                            </span>
                          )}
                        </span>
                      </div>
                      <div className="text-right">
                        {formatPrice(trade.solAmount * solPrice)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <Card className="bg-[#111] border-none p-4">
              <Tabs defaultValue="market" className="w-full">
                <TabsList className="grid grid-cols-3 mb-4">
                  <TabsTrigger value="market">Market</TabsTrigger>
                  <TabsTrigger value="limit">Limit</TabsTrigger>
                  <TabsTrigger value="dca">DCA</TabsTrigger>
                </TabsList>

                <div className="space-y-4">
                  <div>
                    <div className="text-sm text-gray-400 mb-2">Amount (SOL)</div>
                    <div className="grid grid-cols-4 gap-2">
                      <Button variant="outline" size="sm">0.01</Button>
                      <Button variant="outline" size="sm">0.02</Button>
                      <Button variant="outline" size="sm">0.5</Button>
                      <Button variant="outline" size="sm">1</Button>
                    </div>
                  </div>

                  <Input
                    type="number"
                    placeholder="Enter SOL amount..."
                    className="bg-black border-gray-800"
                  />

                  <div className="grid grid-cols-2 gap-2">
                    <Button className="bg-green-600 hover:bg-green-700">Buy</Button>
                    <Button variant="destructive">Sell</Button>
                  </div>

                  <Button className="w-full bg-blue-600 hover:bg-blue-700">Add Funds</Button>

                  <div className="grid grid-cols-2 text-sm">
                    <div>
                      <div className="text-gray-400">Liquidity</div>
                      <div>{formatPrice(token.vSolInBondingCurve * solPrice)}</div>
                    </div>
                    <div>
                      <div className="text-gray-400">Market Cap</div>
                      <div>{formatPriceScale(token.marketCapSol * solPrice)}</div>
                    </div>
                  </div>
                </div>
              </Tabs>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
});

const TokenChart: FC<TokenChartProps> = (props) => {
  return (
    <ErrorBoundary>
      <TokenChartContent {...props} />
    </ErrorBoundary>
  );
};

export default TokenChart;
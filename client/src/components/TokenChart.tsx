import { FC, useEffect, useRef, useState, useCallback, memo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePumpPortalStore } from "@/lib/pump-portal-websocket";
import { ArrowLeft, DollarSign, Coins, Info } from "lucide-react";
import { createChart, IChartApi } from 'lightweight-charts';
import { ErrorBoundary } from './ErrorBoundary';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useQuery } from "@tanstack/react-query";

interface TokenChartProps {
  tokenAddress: string;
  onBack: () => void;
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
  analytics: {
    totalHolders: number;
    averageBalance: number;
    sniperCount: number;
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

  const formatBalance = (balance: number) =>
    balance.toLocaleString(undefined, { maximumFractionDigits: 2 });

  return (
    <div className="flex-1 h-screen bg-black text-white">
      <div className="absolute top-4 left-4 z-10">
        <Button
          variant="ghost"
          className="text-white hover:bg-white/10"
          onClick={onBack}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
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

          <div className="flex gap-6 items-center">
            {/* Analytics Info Button */}
            <Popover>
              <PopoverTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="hover:bg-purple-500/20"
                  onClick={() => setShowAnalytics(true)}
                >
                  <Info className="h-4 w-4 text-purple-400" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 bg-black/95 border-purple-500/20 text-white">
                {isLoadingAnalytics ? (
                  <div className="flex items-center justify-center p-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-purple-500"></div>
                  </div>
                ) : analytics ? (
                  <div className="space-y-4">
                    {/* Top Holders */}
                    <div>
                      <h3 className="text-sm font-semibold text-purple-400 mb-2">Top 10% Holders 👑</h3>
                      <div className="space-y-2">
                        {analytics.topHolders.slice(0, 5).map((holder) => (
                          <div key={holder.address} className="flex justify-between text-sm">
                            <a
                              href={`https://solscan.io/account/${holder.address}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-400 hover:underline"
                            >
                              {formatAddress(holder.address)}
                            </a>
                            <span>{formatBalance(holder.balance)}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Snipers */}
                    <div>
                      <h3 className="text-sm font-semibold text-amber-400 mb-2">Early Snipers 🎯</h3>
                      <div className="space-y-2">
                        {analytics.snipers.slice(0, 5).map((sniper) => (
                          <div key={sniper.address} className="flex justify-between text-sm">
                            <a
                              href={`https://solscan.io/account/${sniper.address}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-400 hover:underline"
                            >
                              {formatAddress(sniper.address)}
                            </a>
                            <span>{formatBalance(sniper.amount)}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Summary */}
                    <div className="pt-2 border-t border-purple-500/20">
                      <div className="grid grid-cols-2 gap-2 text-xs text-gray-400">
                        <div>Total Holders: {analytics.analytics.totalHolders}</div>
                        <div>Avg Balance: {formatBalance(analytics.analytics.averageBalance)}</div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 text-sm text-gray-400">
                    Failed to load analytics data
                  </div>
                )}
              </PopoverContent>
            </Popover>

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
interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  color?: string;
}
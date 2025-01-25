import { FC, useEffect, useRef, useState, useCallback, memo } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePumpPortalStore } from "@/lib/pump-portal-websocket";
import { ArrowLeft, DollarSign, Coins } from "lucide-react";
import { createChart, IChartApi } from 'lightweight-charts';
import { ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { ErrorBoundary } from './ErrorBoundary';

interface TokenChartProps {
  tokenAddress: string;
  onBack: () => void;
}

const TOKEN_DECIMALS = 9;

// Memoized chart component to prevent unnecessary re-renders
const TokenChartContent: FC<TokenChartProps> = memo(({ tokenAddress, onBack }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const isMountedRef = useRef(true);
  const lastRenderTimeRef = useRef<number>(Date.now());
  const [showUsd, setShowUsd] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Prevent unnecessary re-renders with useCallback for store selectors
  const token = usePumpPortalStore(
    useCallback(state => state.tokens.find(t => t.address === tokenAddress), [tokenAddress])
  );

  const solPrice = usePumpPortalStore(state => state.solPrice);
  const isConnected = usePumpPortalStore(state => state.isConnected);

  // Component state debugging
  useEffect(() => {
    const intervalId = setInterval(() => {
      if (isMountedRef.current) {
        console.log('[TokenChart] Health check', {
          timestamp: new Date().toISOString(),
          hasChart: !!chartRef.current,
          hasToken: !!token,
          tradesCount: token?.recentTrades?.length,
          containerWidth: chartContainerRef.current?.clientWidth,
          containerHeight: chartContainerRef.current?.clientHeight,
          isConnected
        });
      }
    }, 5000);

    return () => clearInterval(intervalId);
  }, [token, isConnected]);

  const cleanupChart = useCallback(() => {
    try {
      if (resizeObserverRef.current && chartContainerRef.current) {
        resizeObserverRef.current.disconnect();
        resizeObserverRef.current = null;
      }

      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    } catch (err) {
      console.error('[TokenChart] Cleanup error:', err);
    }
  }, []);

  const initializeChart = useCallback(() => {
    if (!chartContainerRef.current || !token?.recentTrades?.length || !isMountedRef.current) {
      return;
    }

    try {
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
        timeScale: {
          timeVisible: true,
          secondsVisible: false,
          borderColor: '#333333',
        },
      });

      chartRef.current = chart;

      const lineSeries = chart.addLineSeries({
        color: '#22c55e',
        lineWidth: 2,
        priceFormat: {
          type: 'price',
          precision: 9,
          minMove: 0.000000001,
        },
      });

      const trades = token.recentTrades
        .map((trade, index) => {
          const tokenAmount = trade.tokenAmount / (10 ** TOKEN_DECIMALS);
          const fillPrice = tokenAmount > 0 ? trade.solAmount / tokenAmount : 0;
          return {
            time: Math.floor(trade.timestamp / 1000) + (index * 0.001),
            value: fillPrice,
          };
        })
        .filter(trade => !isNaN(trade.value) && trade.value > 0)
        .sort((a, b) => a.time - b.time);

      if (trades.length > 0) {
        lineSeries.setData(trades);
        chart.timeScale().fitContent();
      }

      const resizeObserver = new ResizeObserver(entries => {
        if (!chartRef.current || !isMountedRef.current) return;
        const { width, height } = entries[0].contentRect;

        const now = Date.now();
        if (now - lastRenderTimeRef.current > 100) {
          lastRenderTimeRef.current = now;
          requestAnimationFrame(() => {
            if (chartRef.current && isMountedRef.current) {
              chartRef.current.applyOptions({ width, height });
            }
          });
        }
      });

      if (chartContainerRef.current) {
        resizeObserver.observe(chartContainerRef.current);
        resizeObserverRef.current = resizeObserver;
      }

    } catch (err) {
      console.error('[TokenChart] Initialization error:', err);
      setError(err as Error);
    }
  }, [token?.recentTrades, cleanupChart]);

  // Chart lifecycle management
  useEffect(() => {
    isMountedRef.current = true;

    const setupChart = () => {
      if (!chartRef.current && isMountedRef.current) {
        initializeChart();
      }
    };

    setupChart();

    // Periodic health checks
    const healthCheckInterval = setInterval(() => {
      if (!isMountedRef.current) return;

      // Verify chart container
      if (!chartContainerRef.current || 
          chartContainerRef.current.clientWidth === 0 || 
          chartContainerRef.current.clientHeight === 0) {
        console.log('[TokenChart] Container issue detected, reinitializing');
        cleanupChart();
        setupChart();
        return;
      }

      // Verify chart instance
      if (!chartRef.current) {
        console.log('[TokenChart] Missing chart instance, reinitializing');
        setupChart();
        return;
      }

      // Update chart if needed
      try {
        chartRef.current.timeScale().fitContent();
      } catch (err) {
        console.error('[TokenChart] Chart update error:', err);
        cleanupChart();
        setupChart();
      }
    }, 5000);

    return () => {
      isMountedRef.current = false;
      cleanupChart();
      clearInterval(healthCheckInterval);
    };
  }, [token?.recentTrades, initializeChart, cleanupChart]);

  // Format helpers
  const formatAddress = (address: string) => 
    address ? `${address.slice(0, 4)}...${address.slice(-4)}` : '';

  const formatTimestamp = (timestamp: number) => 
    new Date(timestamp).toLocaleTimeString();

  const formatAmount = (solAmount: number, showUsd: boolean) => {
    if (!solAmount || isNaN(solAmount)) return showUsd ? '$0.00' : '0 SOL';
    return showUsd 
      ? `$${(solAmount * solPrice).toFixed(2)}`
      : `${solAmount.toFixed(9)} SOL`;
  };

  const getTraderAddress = (trade: any) => 
    trade.txType === 'buy' ? trade.traderPublicKey : trade.counterpartyPublicKey;

  if (!token) return null;

  // Calculate bonding curve price
  const bondingCurvePrice = (() => {
    try {
      const vTokens = token.vTokensInBondingCurve / (10 ** TOKEN_DECIMALS);
      if (vTokens <= 0) return 0;
      return token.vSolInBondingCurve / vTokens;
    } catch (err) {
      console.error('[TokenChart] Price calculation error:', err);
      return 0;
    }
  })();

  if (error) {
    return (
      <div className="p-4 bg-black/90 text-white">
        <h3>Chart Error</h3>
        <p>{error.message}</p>
        <Button onClick={() => {
          setError(null);
          cleanupChart();
          initializeChart();
        }}>
          Retry
        </Button>
      </div>
    );
  }

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
          <div className="flex gap-3">
            <div className="text-right">
              <div className="text-sm text-gray-400">Current Price (BC)</div>
              <div className="font-bold">{formatAmount(bondingCurvePrice, showUsd)}</div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-400">SOL in Pool</div>
              <div className="font-bold">{formatAmount(token.vSolInBondingCurve, showUsd)}</div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-400">Market Cap</div>
              <div className="font-bold">{formatAmount(token.marketCapSol, showUsd)}</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-[1fr,300px] gap-4">
          <ResizablePanelGroup direction="vertical" className="h-[calc(100vh-200px)]">
            <ResizablePanel defaultSize={40} minSize={30}>
              <div className="h-full bg-[#111] rounded-lg p-4">
                <div ref={chartContainerRef} className="h-full w-full" />
              </div>
            </ResizablePanel>
            <ResizablePanel defaultSize={60} minSize={40}>
              <div className="h-full bg-[#111] rounded-lg p-4 overflow-hidden">
                <div className="flex justify-between items-center mb-2">
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
                <div className="space-y-2 overflow-y-auto h-[calc(100%-2rem)]">
                  {token.recentTrades?.map((trade, idx) => (
                    <div
                      key={trade.signature || idx}
                      className={`flex items-center justify-between p-2 rounded bg-black/20 text-sm ${
                        trade.txType === 'buy' ? 'text-green-500' : 'text-red-500'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span>{formatTimestamp(trade.timestamp)}</span>
                        <span>{formatAddress(getTraderAddress(trade))}</span>
                      </div>
                      <div className="text-right">
                        {formatAmount(trade.solAmount, showUsd)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>

          <div className="space-y-4">
            <Card className="bg-[#111] border-none p-4">
              <Tabs defaultValue="market" className="w-full">
                <TabsList className="grid grid-cols-3 mb-4">
                  <TabsTrigger value="market">Market</TabsTrigger>
                  <TabsTrigger value="limit">Limit</TabsTrigger>
                  <TabsTrigger value="dca">DCA</TabsTrigger>
                </TabsList>
              </Tabs>

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
                    <div className="text-gray-400">SOL in Pool</div>
                    <div>{formatAmount(token.vSolInBondingCurve, showUsd)}</div>
                  </div>
                  <div>
                    <div className="text-gray-400">Market Cap</div>
                    <div>{formatAmount(token.marketCapSol, showUsd)}</div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
});

// Wrap the chart content with error boundary
const TokenChart: FC<TokenChartProps> = (props) => {
  return (
    <ErrorBoundary>
      <TokenChartContent {...props} />
    </ErrorBoundary>
  );
};

export default TokenChart;
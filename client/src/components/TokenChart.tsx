import { FC, useEffect, useRef, useState, useCallback } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePumpPortalStore } from "@/lib/pump-portal-websocket";
import { ArrowLeft, DollarSign, Coins } from "lucide-react";
import { createChart, IChartApi } from 'lightweight-charts';
import { ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";

interface TokenChartProps {
  tokenAddress: string;
  onBack: () => void;
}

const TOKEN_DECIMALS = 9;

const TokenChart: FC<TokenChartProps> = ({ tokenAddress, onBack }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const isMountedRef = useRef(true);
  const lastRenderTimeRef = useRef<number>(Date.now());
  const [showUsd, setShowUsd] = useState(true);
  const [renderKey, setRenderKey] = useState(0); // Force re-render key

  const token = usePumpPortalStore(state => 
    state.tokens.find(t => t.address === tokenAddress)
  );
  const solPrice = usePumpPortalStore(state => state.solPrice);
  const isConnected = usePumpPortalStore(state => state.isConnected);

  // Debug logs
  useEffect(() => {
    console.log('[TokenChart] Component mounted', {
      tokenAddress,
      hasToken: !!token,
      trades: token?.recentTrades?.length,
      chartExists: !!chartRef.current,
      timestamp: new Date().toISOString()
    });

    return () => {
      console.log('[TokenChart] Component unmounting', {
        tokenAddress,
        timestamp: new Date().toISOString()
      });
    };
  }, [tokenAddress, token]);

  // Cleanup function
  const cleanupChart = useCallback(() => {
    console.log('[TokenChart] Cleaning up chart', {
      hasChart: !!chartRef.current,
      hasObserver: !!resizeObserverRef.current,
      timestamp: new Date().toISOString()
    });

    if (resizeObserverRef.current && chartContainerRef.current) {
      resizeObserverRef.current.disconnect();
      resizeObserverRef.current = null;
    }

    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }
  }, []);

  // Initialize chart
  const initializeChart = useCallback(() => {
    if (!chartContainerRef.current || !token?.recentTrades || !isMountedRef.current) {
      console.log('[TokenChart] Skipping chart initialization', {
        hasContainer: !!chartContainerRef.current,
        hasTrades: !!token?.recentTrades,
        isMounted: isMountedRef.current,
        timestamp: new Date().toISOString()
      });
      return;
    }

    try {
      console.log('[TokenChart] Initializing chart', {
        tradesCount: token.recentTrades.length,
        timestamp: new Date().toISOString()
      });

      // Clean up existing chart if any
      cleanupChart();

      // Create new chart
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

      // Convert trades to chart data
      const trades = token.recentTrades
        .map((trade, index) => {
          const tokenAmount = trade.tokenAmount / (10 ** TOKEN_DECIMALS);
          const fillPrice = tokenAmount > 0 ? trade.solAmount / tokenAmount : 0;
          const timestamp = Math.floor(trade.timestamp / 1000);

          return {
            time: timestamp + (index * 0.001),
            value: fillPrice,
          };
        })
        .filter(trade => !isNaN(trade.value) && trade.value > 0)
        .sort((a, b) => {
          if (a.time === b.time) return 0;
          return a.time - b.time;
        });

      if (trades.length > 0) {
        lineSeries.setData(trades);
        chart.timeScale().fitContent();
      }

      // Set up resize observer
      const resizeObserver = new ResizeObserver(entries => {
        if (!chartRef.current || !isMountedRef.current) return;
        const { width, height } = entries[0].contentRect;

        // Debounce resize updates
        const now = Date.now();
        if (now - lastRenderTimeRef.current > 100) { // Only update every 100ms
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

    } catch (error) {
      console.error('[TokenChart] Chart initialization error:', error);
      // Try to recover
      cleanupChart();

      // Force component re-render
      setRenderKey(prev => prev + 1);
    }
  }, [token?.recentTrades, cleanupChart]);

  // Handle chart initialization and cleanup
  useEffect(() => {
    isMountedRef.current = true;
    initializeChart();

    // Periodic chart refresh and health check
    const refreshInterval = setInterval(() => {
      if (isMountedRef.current) {
        // Check if chart container is still visible
        if (chartContainerRef.current?.clientWidth === 0 || chartContainerRef.current?.clientHeight === 0) {
          console.log('[TokenChart] Container dimensions zero, forcing re-render');
          setRenderKey(prev => prev + 1);
          return;
        }

        // Check if chart is responsive
        if (chartRef.current) {
          try {
            chartRef.current.timeScale().fitContent();
          } catch (error) {
            console.error('[TokenChart] Chart refresh error:', error);
            setRenderKey(prev => prev + 1);
          }
        }
      }
    }, 10000); // Check every 10 seconds

    return () => {
      isMountedRef.current = false;
      cleanupChart();
      clearInterval(refreshInterval);
    };
  }, [token?.recentTrades, tokenAddress, initializeChart, cleanupChart, renderKey]);

  // Handle WebSocket reconnection and status
  useEffect(() => {
    if (!isConnected) {
      const reconnectInterval = setInterval(() => {
        if (!isConnected) {
          window.location.reload();
        }
      }, 30000);

      return () => clearInterval(reconnectInterval);
    }
  }, [isConnected]);

  // Format helpers
  const formatAddress = (address: string) => {
    if (!address) return '';
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const formatAmount = (solAmount: number, showUsd: boolean) => {
    if (!solAmount || isNaN(solAmount)) return showUsd ? '$0.00' : '0 SOL';

    if (showUsd) {
      const usdAmount = solAmount * solPrice;
      return `$${usdAmount.toFixed(2)}`;
    }

    return `${solAmount.toFixed(9)} SOL`;
  };

  const getTraderAddress = (trade: any) => {
    if (trade.txType === 'buy') {
      return trade.traderPublicKey;
    } else {
      return trade.counterpartyPublicKey || trade.traderPublicKey;
    }
  };

  if (!token) return null;

  // Calculate current bonding curve price - moved inside render after token null check
  const bondingCurvePrice = token ? (() => {
    const vTokens = token.vTokensInBondingCurve / (10 ** TOKEN_DECIMALS);
    if (vTokens <= 0) return 0;
    return token.vSolInBondingCurve / vTokens;
  })() : 0;

  return (
    <div className="flex-1 h-screen bg-black text-white" key={renderKey}>
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
                        <span>
                          {formatAddress(getTraderAddress(trade))}
                        </span>
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

                <Input type="number" placeholder="Enter SOL amount..." className="bg-black border-gray-800" />

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
};

export default TokenChart;
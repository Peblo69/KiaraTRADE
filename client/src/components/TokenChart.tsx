import { FC, useEffect, useRef, useState, useCallback, memo } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePumpPortalStore } from "@/lib/pump-portal-websocket";
import { ArrowLeft, DollarSign, Coins } from "lucide-react";
import { createChart, IChartApi, CandlestickData } from 'lightweight-charts';
import { ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { ErrorBoundary } from './ErrorBoundary';

interface TokenChartProps {
  tokenAddress: string;
  onBack: () => void;
}

const TOKEN_DECIMALS = 9;
const CANDLE_PERIOD = 15; // 15 seconds per candle
const VISIBLE_CANDLES = 50; // Number of candles to show

interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

// Memoized chart component to prevent unnecessary re-renders
const TokenChartContent: FC<TokenChartProps> = memo(({ tokenAddress, onBack }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const isMountedRef = useRef(true);
  const lastRenderTimeRef = useRef<number>(Date.now());
  const [showUsd, setShowUsd] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [currentCandle, setCurrentCandle] = useState<Candle | null>(null);

  const token = usePumpPortalStore(
    useCallback(state => state.tokens.find(t => t.address === tokenAddress), [tokenAddress])
  );

  const solPrice = usePumpPortalStore(state => state.solPrice);
  const isConnected = usePumpPortalStore(state => state.isConnected);

  const processTradeIntoCandle = useCallback((trade: any): Candle => {
    const tokenAmount = trade.tokenAmount / (10 ** TOKEN_DECIMALS);
    const price = tokenAmount > 0 ? trade.solAmount / tokenAmount : 0;
    const timestamp = Math.floor(trade.timestamp / 1000);
    const candleStartTime = Math.floor(timestamp / CANDLE_PERIOD) * CANDLE_PERIOD;

    // Find existing candle for this time period or create new one
    const existingCandle = currentCandle?.time === candleStartTime ? currentCandle : null;

    if (!existingCandle) {
      return {
        time: candleStartTime,
        open: price,
        high: price,
        low: price,
        close: price
      };
    }

    return {
      ...existingCandle,
      high: Math.max(existingCandle.high, price),
      low: Math.min(existingCandle.low, price),
      close: price // Latest price becomes close
    };
  }, [currentCandle]);

  const cleanupChart = useCallback(() => {
    if (resizeObserverRef.current && chartContainerRef.current) {
      resizeObserverRef.current.disconnect();
      resizeObserverRef.current = null;
    }

    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }
  }, []);

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
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: true,
        borderColor: '#333333',
        rightOffset: 12,
        barSpacing: 12,
        fixLeftEdge: true,
        lockVisibleTimeRangeOnResize: true,
      },
    });

    chartRef.current = chart;

    const candlestickSeries = chart.addCandlestickSeries({
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderUpColor: '#26a69a',
      borderDownColor: '#ef5350',
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350',
    });

    // Process trades into candles
    const candles = new Map<number, Candle>();

    token.recentTrades.forEach(trade => {
      const candle = processTradeIntoCandle(trade);
      const existing = candles.get(candle.time);

      if (!existing) {
        candles.set(candle.time, candle);
      } else {
        candles.set(candle.time, {
          ...existing,
          high: Math.max(existing.high, candle.high),
          low: Math.min(existing.low, candle.low),
          close: candle.close,
        });
      }
    });

    const sortedCandles = Array.from(candles.values())
      .sort((a, b) => a.time - b.time)
      .slice(-VISIBLE_CANDLES);

    if (sortedCandles.length > 0) {
      candlestickSeries.setData(sortedCandles);

      // Calculate price range for auto-scaling
      const priceRange = sortedCandles.reduce(
        (acc, candle) => ({
          min: Math.min(acc.min, candle.low),
          max: Math.max(acc.max, candle.high),
        }),
        { min: Infinity, max: -Infinity }
      );

      // Add padding to price range
      const padding = (priceRange.max - priceRange.min) * 0.2;
      candlestickSeries.applyOptions({
        priceFormat: {
          type: 'price',
          precision: 9,
          minMove: 0.000000001,
        },
      });

      // Set visible range
      chart.timeScale().setVisibleLogicalRange({
        from: Math.max(0, sortedCandles.length - VISIBLE_CANDLES),
        to: sortedCandles.length + 5,
      });

      // Update current candle
      setCurrentCandle(sortedCandles[sortedCandles.length - 1]);
    }

    // Handle resize
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

  }, [token?.recentTrades, cleanupChart, processTradeIntoCandle]);

  // Chart lifecycle and updates
  useEffect(() => {
    isMountedRef.current = true;
    initializeChart();

    const updateInterval = setInterval(() => {
      if (!token?.recentTrades?.length || !chartRef.current) return;

      const latestTrade = token.recentTrades[0];
      if (latestTrade) {
        const newCandle = processTradeIntoCandle(latestTrade);

        if (chartRef.current) {
          const series = chartRef.current.series()[0];
          if (currentCandle?.time !== newCandle.time) {
            series.update(newCandle);
            setCurrentCandle(newCandle);
          }
        }
      }
    }, 1000);

    return () => {
      isMountedRef.current = false;
      cleanupChart();
      clearInterval(updateInterval);
    };
  }, [token?.recentTrades, initializeChart, cleanupChart, processTradeIntoCandle]);

  const formatPrice = (value: number) => {
    if (!value || isNaN(value)) return showUsd ? '$0.00' : '0 SOL';
    return showUsd 
      ? `$${(value * solPrice).toFixed(2)}`
      : `${value.toFixed(9)} SOL`;
  };

  const formatAddress = (address: string) => 
    address ? `${address.slice(0, 4)}...${address.slice(-4)}` : '';

  const formatTimestamp = (timestamp: number) => 
    new Date(timestamp).toLocaleTimeString();

  if (!token) return null;

  // Calculate current price from bonding curve
  const currentPrice = token.vTokensInBondingCurve > 0
    ? token.vSolInBondingCurve / (token.vTokensInBondingCurve / (10 ** TOKEN_DECIMALS))
    : 0;

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

          <div className="flex gap-6">
            <div className="text-right">
              <div className="text-sm text-gray-400">Price</div>
              <div className="font-bold">{formatPrice(currentPrice)}</div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-400">Liquidity</div>
              <div className="font-bold">{formatPrice(token.vSolInBondingCurve)}</div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-400">Market Cap</div>
              <div className="font-bold">{formatPrice(token.marketCapSol)}</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-[1fr,300px] gap-4">
          <div className="space-y-4">
            <div className="h-[500px] bg-[#111] rounded-lg p-4">
              <div ref={chartContainerRef} className="h-full" />
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
                {token.recentTrades?.map((trade, idx) => (
                  <div
                    key={trade.signature || idx}
                    className={`flex items-center justify-between p-2 rounded bg-black/20 text-sm ${
                      trade.txType === 'buy' ? 'text-green-500' : 'text-red-500'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span>{formatTimestamp(trade.timestamp)}</span>
                      <span>{formatAddress(trade.traderPublicKey)}</span>
                    </div>
                    <div className="text-right">
                      {formatPrice(trade.solAmount)}
                    </div>
                  </div>
                ))}
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
                      <div>{formatPrice(token.vSolInBondingCurve)}</div>
                    </div>
                    <div>
                      <div className="text-gray-400">Market Cap</div>
                      <div>{formatPrice(token.marketCapSol)}</div>
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

// Wrap with error boundary
const TokenChart: FC<TokenChartProps> = (props) => {
  return (
    <ErrorBoundary>
      <TokenChartContent {...props} />
    </ErrorBoundary>
  );
};

export default TokenChart;
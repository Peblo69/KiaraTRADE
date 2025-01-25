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

type TimeInterval = {
  label: string;
  seconds: number;
};

const TIME_INTERVALS: TimeInterval[] = [
  { label: '1s', seconds: 1 },
  { label: '5s', seconds: 5 },
  { label: '15s', seconds: 15 },
  { label: '30s', seconds: 30 },
  { label: '1m', seconds: 60 },
  { label: '15m', seconds: 900 },
  { label: '30m', seconds: 1800 },
  { label: '1h', seconds: 3600 },
];

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
  const [showUsd, setShowUsd] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [currentCandle, setCurrentCandle] = useState<Candle | null>(null);
  const [selectedInterval, setSelectedInterval] = useState<TimeInterval>(TIME_INTERVALS[2]); // Default to 15s

  const token = usePumpPortalStore(
    useCallback(state => state.tokens.find(t => t.address === tokenAddress), [tokenAddress])
  );

  const solPrice = usePumpPortalStore(state => state.solPrice);

  // Convert SOL amount to market cap
  const calculateMarketCap = useCallback((solAmount: number) => {
    if (!solAmount || !solPrice) return 0;
    return solAmount * solPrice;
  }, [solPrice]);

  const processTradeIntoCandle = useCallback((trade: any): Candle => {
    const marketCap = calculateMarketCap(trade.marketCapSol);
    const timestamp = Math.floor(trade.timestamp / 1000);
    const candleStartTime = Math.floor(timestamp / selectedInterval.seconds) * selectedInterval.seconds;

    // Find existing candle for this time period or create new one
    const existingCandle = currentCandle?.time === candleStartTime ? currentCandle : null;

    if (!existingCandle) {
      // Start new candle from previous close or current market cap
      const startValue = currentCandle ? currentCandle.close : marketCap;
      return {
        time: candleStartTime,
        open: startValue,
        high: Math.max(startValue, marketCap),
        low: Math.min(startValue, marketCap),
        close: marketCap
      };
    }

    // Update existing candle preserving continuous movement
    return {
      ...existingCandle,
      high: Math.max(existingCandle.high, marketCap),
      low: Math.min(existingCandle.low, marketCap),
      close: marketCap
    };
  }, [currentCandle, selectedInterval, calculateMarketCap]);

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
        scaleMargins: {
          top: 0.1,
          bottom: 0.1,
        },
        autoScale: true,
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: true,
        borderColor: '#333333',
        rightOffset: 15,
        barSpacing: 12,
        lockVisibleTimeRangeOnResize: true,
        rightBarStaysOnScroll: true,
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: true,
      },
      handleScale: {
        axisPressedMouseMove: {
          time: true,
          price: true,
        },
        mouseWheel: true,
        pinch: true,
      },
      crosshair: {
        mode: 1,
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
      priceFormat: {
        type: 'price',
        precision: 4,
        minMove: 0.0001,
      },
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
      .sort((a, b) => a.time - b.time);

    if (sortedCandles.length > 0) {
      candlestickSeries.setData(sortedCandles);
      setCurrentCandle(sortedCandles[sortedCandles.length - 1]);
    }

    // Handle resize
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

  }, [token?.recentTrades, cleanupChart, processTradeIntoCandle]);

  // Handle interval change
  const handleIntervalChange = useCallback((interval: TimeInterval) => {
    setSelectedInterval(interval);
    cleanupChart();
    setTimeout(initializeChart, 0); // Re-initialize with new interval
  }, [cleanupChart, initializeChart]);

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
      ? `$${(value).toFixed(2)}`
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
            <div className="h-[500px] bg-[#111] rounded-lg">
              <div className="flex items-center gap-2 p-2 border-b border-gray-800">
                {TIME_INTERVALS.map((interval) => (
                  <Button
                    key={interval.label}
                    variant={selectedInterval === interval ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => handleIntervalChange(interval)}
                    className="text-xs"
                  >
                    {interval.label}
                  </Button>
                ))}
              </div>
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
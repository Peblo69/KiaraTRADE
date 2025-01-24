import { FC, useEffect, useRef, useState } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePumpPortalStore } from "@/lib/pump-portal-websocket";
import { ArrowLeft } from "lucide-react";
import { createChart } from 'lightweight-charts';
import { ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";

interface TokenChartProps {
  tokenAddress: string;
  onBack: () => void;
}

interface TokenTrade {
  signature: string;
  timestamp: number;
  price: number;
}

type TimeFrame = '1s' | '5s' | '15s' | '30s' | '1m' | '15m' | '30m' | '1h';

export function TokenChart({ tokenAddress, onBack }: TokenChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [timeFrame, setTimeFrame] = useState<TimeFrame>('1m');
  const token = usePumpPortalStore(state => 
    state.tokens.find(t => t.address === tokenAddress)
  );

  useEffect(() => {
    if (!chartContainerRef.current || !token?.recentTrades) return;

    console.log('Trade data:', token.recentTrades);

    // Process trades into consistent time-ordered data points
    const trades = token.recentTrades
      .map(trade => ({
        timestamp: Math.floor(trade.timestamp / 1000) * 1000,
        price: Number(trade.price) || 0,
      }))
      .filter(trade => !isNaN(trade.price) && trade.price > 0)
      .sort((a, b) => a.timestamp - b.timestamp);

    // Create candles from trades
    const candleMap = new Map();
    const CANDLE_INTERVALS: Record<TimeFrame, number> = {
      '1s': 1000,
      '5s': 5000,
      '15s': 15000,
      '30s': 30000,
      '1m': 60000,
      '15m': 15 * 60000,
      '30m': 30 * 60000,
      '1h': 60 * 60000,
    };

    const CANDLE_INTERVAL = CANDLE_INTERVALS[timeFrame];

    trades.forEach(trade => {
      const candleTime = Math.floor(trade.timestamp / CANDLE_INTERVAL) * CANDLE_INTERVAL;

      if (!candleMap.has(candleTime)) {
        candleMap.set(candleTime, {
          time: candleTime / 1000,
          open: trade.price,
          high: trade.price,
          low: trade.price,
          close: trade.price
        });
      } else {
        const candle = candleMap.get(candleTime);
        candle.high = Math.max(candle.high, trade.price);
        candle.low = Math.min(candle.low, trade.price);
        candle.close = trade.price;
      }
    });

    const candleData = Array.from(candleMap.values())
      .sort((a, b) => a.time - b.time);

    if (candleData.length === 0) return;

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

    const candlestickSeries = chart.addCandlestickSeries({
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderVisible: false,
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444',
    });

    candlestickSeries.setData(candleData);

    // Set visible range with padding
    const timeRange = {
      from: candleData[0].time - 300,
      to: candleData[candleData.length - 1].time + 300
    };

    chart.timeScale().setVisibleRange(timeRange);

    // Handle resize
    const resizeObserver = new ResizeObserver(entries => {
      if (entries[0]) {
        chart.applyOptions({
          width: entries[0].contentRect.width,
          height: entries[0].contentRect.height,
        });
      }
    });

    resizeObserver.observe(chartContainerRef.current);

    return () => {
      chart.remove();
      resizeObserver.disconnect();
    };
  }, [token?.recentTrades, timeFrame]);

  if (!token) return null;

  const formatAddress = (address: string) => {
    if (!address) return '';
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const formatPrice = (price: number | string | undefined) => {
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    if (!numPrice || isNaN(numPrice)) return '$0.00';
    return `$${numPrice.toFixed(8)}`;
  };

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
              src={token.imageLink || '/placeholder.png'} 
              className="w-8 h-8 rounded-full"
              alt={token.symbol}
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/placeholder.png';
              }}
            />
            <div>
              <h2 className="text-2xl font-bold">{token.symbol}</h2>
              <div className="text-sm text-gray-400">{formatPrice(token.price)}</div>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="text-right">
              <div className="text-sm text-gray-400">Market Cap</div>
              <div className="font-bold">${token.marketCap?.toFixed(2) || '0.00'}</div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-400">Liquidity</div>
              <div className="font-bold">${token.liquidity?.toFixed(2) || '0.00'}</div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-400">Volume (24h)</div>
              <div className="font-bold">${token.volume?.toFixed(2) || '0.00'}</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-[1fr,300px] gap-4">
          <ResizablePanelGroup direction="vertical" className="h-[600px]">
            <ResizablePanel defaultSize={80} minSize={30}>
              <div className="h-full bg-[#111] rounded-lg overflow-hidden">
                <div className="p-2 border-b border-white/10">
                  <div className="flex gap-1">
                    {(['1s', '5s', '15s', '30s', '1m', '15m', '30m', '1h'] as TimeFrame[]).map((tf) => (
                      <Button
                        key={tf}
                        variant={timeFrame === tf ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setTimeFrame(tf)}
                        className="text-xs px-2 py-1"
                      >
                        {tf}
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="p-4 h-[calc(100%-40px)]">
                  <div ref={chartContainerRef} className="h-full w-full" />
                </div>
              </div>
            </ResizablePanel>
            <ResizablePanel defaultSize={20} minSize={10}>
              <div className="h-full bg-[#111] rounded-lg p-4 overflow-hidden">
                <h3 className="text-sm font-semibold mb-2">Recent Trades</h3>
                <div className="space-y-2 overflow-y-auto h-[calc(100%-2rem)]">
                  {token.recentTrades?.map((trade, idx) => (
                    <div
                      key={trade.signature || idx}
                      className="flex items-center justify-between p-2 rounded bg-black/20 text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <span>{formatTimestamp(trade.timestamp)}</span>
                        <span>{trade.signature ? formatAddress(trade.signature) : 'Unknown'}</span>
                      </div>
                      <div className="text-right">
                        <div>{formatPrice(trade.price)}</div>
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
                  <div className="text-sm text-gray-400 mb-2">Amount</div>
                  <div className="grid grid-cols-4 gap-2">
                    <Button variant="outline" size="sm">0.01</Button>
                    <Button variant="outline" size="sm">0.02</Button>
                    <Button variant="outline" size="sm">0.5</Button>
                    <Button variant="outline" size="sm">1</Button>
                  </div>
                </div>

                <Input type="number" placeholder="Enter amount..." className="bg-black border-gray-800" />

                <div className="grid grid-cols-2 gap-2">
                  <Button className="bg-green-600 hover:bg-green-700">Buy</Button>
                  <Button variant="destructive">Sell</Button>
                </div>

                <Button className="w-full bg-blue-600 hover:bg-blue-700">Add Funds</Button>

                <div className="grid grid-cols-3 text-sm">
                  <div>
                    <div className="text-gray-400">Invested</div>
                    <div>$0.00</div>
                  </div>
                  <div>
                    <div className="text-gray-400">Sold</div>
                    <div>$0.00</div>
                  </div>
                  <div>
                    <div className="text-gray-400">P/L</div>
                    <div className="text-red-500">-0%</div>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Real-time trades panel */}
          <div className="mt-4 bg-[#111] rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-3">Real-time Trades</h3>
            <div className="grid grid-cols-4 text-sm text-gray-400 mb-2">
              <div>Time</div>
              <div>Type</div>
              <div>Price</div>
              <div>Amount</div>
            </div>
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {token.recentTrades?.map((trade, idx) => (
                <div 
                  key={trade.signature || idx}
                  className={`grid grid-cols-4 text-sm p-2 rounded ${
                    trade.type === 'buy' ? 'bg-green-500/10' : 'bg-red-500/10'
                  }`}
                >
                  <div>{new Date(trade.timestamp).toLocaleTimeString()}</div>
                  <div className={trade.type === 'buy' ? 'text-green-400' : 'text-red-400'}>
                    {trade.type === 'buy' ? 'Buy' : 'Sell'}
                  </div>
                  <div>{formatPrice(trade.price)}</div>
                  <div>{trade.amount?.toFixed(4)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TokenChart;
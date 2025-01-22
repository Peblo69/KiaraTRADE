import { useEffect, useRef, useState } from 'react';
import { createChart, CrosshairMode } from 'lightweight-charts';
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { usePumpPortalStore } from "@/lib/pump-portal-websocket";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface TokenChartProps {
  tokenAddress: string;
}

export function TokenChart({ tokenAddress }: TokenChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [activeTimeframe, setActiveTimeframe] = useState('1m');

  const token = usePumpPortalStore(state => 
    state.tokens.find(t => t.address === tokenAddress)
  );

  useEffect(() => {
    if (!chartContainerRef.current || !token) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { color: 'transparent' },
        textColor: 'rgba(255, 255, 255, 0.9)',
      },
      grid: {
        vertLines: { color: 'rgba(197, 203, 206, 0.1)' },
        horzLines: { color: 'rgba(197, 203, 206, 0.1)' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
      },
      rightPriceScale: {
        borderColor: 'rgba(197, 203, 206, 0.8)',
      },
      timeScale: {
        borderColor: 'rgba(197, 203, 206, 0.8)',
        timeVisible: true,
        secondsVisible: false,
      },
    });

    // Add candlestick series
    const candlestickSeries = chart.addCandlestickSeries({
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderVisible: false,
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350',
    });

    // Add volume series
    const volumeSeries = chart.addHistogramSeries({
      color: '#26a69a',
      priceFormat: {
        type: 'volume',
      },
      priceScaleId: '',
      scaleMargins: {
        top: 0.8,
        bottom: 0,
      },
    });

    // Convert trade history to candlestick data
    const candleData = token.timeWindows[activeTimeframe].candles.map(candle => ({
      time: candle.timestamp / 1000,
      open: candle.openPrice,
      high: candle.highPrice,
      low: candle.lowPrice,
      close: candle.closePrice,
    }));

    const volumeData = token.timeWindows[activeTimeframe].candles.map(candle => ({
      time: candle.timestamp / 1000,
      value: candle.volume,
      color: candle.closePrice >= candle.openPrice ? '#26a69a' : '#ef5350',
    }));

    candlestickSeries.setData(candleData);
    volumeSeries.setData(volumeData);

    // Resize handler
    const handleResize = () => {
      chart.applyOptions({
        width: chartContainerRef.current?.clientWidth ?? 600,
      });
    };

    window.addEventListener('resize', handleResize);

    // Initial size
    chart.applyOptions({
      width: chartContainerRef.current?.clientWidth ?? 600,
      height: 400,
    });

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [token, activeTimeframe]);

  if (!token) return null;

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="space-y-1">
          <h3 className="font-semibold text-lg tracking-tight">
            {token.symbol} ({token.name})
          </h3>
          <p className="text-sm text-muted-foreground">
            Current Price: ${token.price.toFixed(8)}
          </p>
        </div>
        <div className="text-right space-y-1">
          <p className="text-sm font-medium">Market Cap: ${token.marketCap.toFixed(2)}</p>
          <p className="text-sm text-muted-foreground">
            Liquidity: ${token.liquidity.toFixed(2)}
          </p>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="1m" className="mb-4" onValueChange={setActiveTimeframe}>
          <TabsList>
            <TabsTrigger value="1m">1m</TabsTrigger>
            <TabsTrigger value="5m">5m</TabsTrigger>
            <TabsTrigger value="15m">15m</TabsTrigger>
            <TabsTrigger value="1h">1h</TabsTrigger>
            <TabsTrigger value="4h">4h</TabsTrigger>
            <TabsTrigger value="1d">1D</TabsTrigger>
          </TabsList>
        </Tabs>

        <div ref={chartContainerRef} className="h-[400px] w-full" />

        <div className="mt-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span>24h Volume</span>
            <span className="font-medium">${token.volume24h.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>24h Trades</span>
            <span className="font-medium">
              {token.trades24h} ({token.buys24h} buys, {token.sells24h} sells)
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Unique Wallets</span>
            <span className="font-medium">{token.walletCount}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default TokenChart;
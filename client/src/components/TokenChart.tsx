import { useState, useRef, useEffect } from 'react';
import { createChart, ColorType, IChartApi, ISeriesApi } from 'lightweight-charts';
import { Card } from '@/components/ui/card';
import { useTokenPriceStore } from '@/lib/price-history';
import { pumpFunSocket } from '@/lib/pumpfun-websocket';

interface TokenChartProps {
  tokenAddress: string;
  height?: number;
}

export default function TokenChart({ tokenAddress, height = 400 }: TokenChartProps) {
  const [candles, setCandles] = useState<any[]>([]);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chart = useRef<IChartApi | null>(null);
  const candlestickSeries = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeSeries = useRef<ISeriesApi<"Histogram"> | null>(null);

  // Load initial data and setup WebSocket
  useEffect(() => {
    console.log('[TokenChart] Loading initial data for token:', tokenAddress);

    // Get initial price data
    const initialData = useTokenPriceStore.getState().getPriceHistory(tokenAddress, '5m');
    console.log('[TokenChart] Initial data from store:', initialData);

    if (initialData && initialData.length > 0) {
      console.log('[TokenChart] Setting initial candles:', initialData);
      setCandles(initialData);
    } else {
      console.log('[TokenChart] No initial data available');
      // Create initial candle with current time
      const currentTime = Math.floor(Date.now() / (5 * 60 * 1000)) * (5 * 60 * 1000);
      setCandles([{
        timestamp: currentTime,
        open: 0,
        high: 0,
        low: 0,
        close: 0,
        volume: 0
      }]);
    }

    // Connect to WebSocket
    pumpFunSocket.connect();

    // Subscribe to updates
    const unsubscribe = pumpFunSocket.subscribe((data) => {
      console.log('[TokenChart] Received update:', data);
      if (data.address !== tokenAddress) return;

      setCandles(prevCandles => {
        const currentTime = Math.floor(Date.now() / (5 * 60 * 1000)) * (5 * 60 * 1000);
        const lastCandle = prevCandles[prevCandles.length - 1];

        // Update existing candle if in same time window
        if (lastCandle && Math.floor(lastCandle.timestamp / (5 * 60 * 1000)) === Math.floor(currentTime / (5 * 60 * 1000))) {
          const updatedCandle = {
            ...lastCandle,
            high: Math.max(lastCandle.high, data.price),
            low: Math.min(lastCandle.low, data.price),
            close: data.price,
            volume: lastCandle.volume + (data.volume || 0)
          };
          return [...prevCandles.slice(0, -1), updatedCandle];
        }

        // Create new candle
        const newCandle = {
          timestamp: currentTime,
          open: data.price,
          high: data.price,
          low: data.price,
          close: data.price,
          volume: data.volume || 0
        };

        return [...prevCandles, newCandle];
      });
    });

    return () => {
      unsubscribe();
    };
  }, [tokenAddress]);

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current || chart.current) return;

    console.log('[TokenChart] Initializing chart');
    chart.current = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: 'rgba(255, 255, 255, 0.5)',
      },
      grid: {
        vertLines: { color: 'rgba(255, 255, 255, 0.05)' },
        horzLines: { color: 'rgba(255, 255, 255, 0.05)' },
      },
      crosshair: {
        mode: 0,
        vertLine: {
          width: 1,
          color: 'rgba(255, 255, 255, 0.1)',
          style: 3,
        },
        horzLine: {
          width: 1,
          color: 'rgba(255, 255, 255, 0.1)',
          style: 3,
        },
      },
      rightPriceScale: {
        borderColor: 'rgba(255, 255, 255, 0.1)',
      },
      timeScale: {
        borderColor: 'rgba(255, 255, 255, 0.1)',
        timeVisible: true,
        secondsVisible: false,
      },
    });

    candlestickSeries.current = chart.current.addCandlestickSeries({
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderVisible: false,
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350',
    });

    volumeSeries.current = chart.current.addHistogramSeries({
      color: '#26a69a',
      priceFormat: {
        type: 'volume',
      },
      priceScaleId: 'volume',
    });

    chart.current.priceScale('volume').applyOptions({
      scaleMargins: {
        top: 0.8,
        bottom: 0,
      },
    });

    const handleResize = () => {
      if (chartContainerRef.current && chart.current) {
        chart.current.applyOptions({ 
          width: chartContainerRef.current.clientWidth 
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (chart.current) {
        chart.current.remove();
        chart.current = null;
      }
    };
  }, [height]);

  // Update chart when candles change
  useEffect(() => {
    if (!candlestickSeries.current || !volumeSeries.current || !candles.length) {
      console.log('[TokenChart] Chart series not ready or no candles');
      return;
    }

    console.log('[TokenChart] Updating chart with candles:', candles);

    const chartData = candles.map(candle => ({
      time: Math.floor(candle.timestamp / 1000),
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close
    }));

    const volumeData = candles.map(candle => ({
      time: Math.floor(candle.timestamp / 1000),
      value: candle.volume,
      color: candle.close >= candle.open ? 
        'rgba(38, 166, 154, 0.5)' : 
        'rgba(239, 83, 80, 0.5)'
    }));

    console.log('[TokenChart] Setting chart data:', { chartData, volumeData });

    candlestickSeries.current.setData(chartData);
    volumeSeries.current.setData(volumeData);

    // Set visible range to last hour
    if (chart.current) {
      const lastTimestamp = Math.floor(candles[candles.length - 1].timestamp / 1000);
      chart.current.timeScale().setVisibleRange({
        from: lastTimestamp - 3600,
        to: lastTimestamp
      });
    }
  }, [candles]);

  const currentPrice = candles.length ? `$${candles[candles.length - 1].close.toFixed(6)}` : 'Loading...';
  const priceChange = candles.length >= 2 ? 
    ((candles[candles.length - 1].close - candles[candles.length - 2].close) / candles[candles.length - 2].close * 100).toFixed(2) + '%' : 
    '';
  const priceColor = priceChange.startsWith('-') ? 'text-red-500' : 'text-green-500';

  return (
    <Card className="p-4 bg-black/40 backdrop-blur-lg border border-gray-800">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-white">Price Chart</h3>
        <div className="flex items-center gap-2">
          <span className="text-lg text-white">{currentPrice}</span>
          {priceChange && (
            <span className={`text-sm ${priceColor}`}>
              {priceChange}
            </span>
          )}
        </div>
      </div>
      <div ref={chartContainerRef} />
    </Card>
  );
}
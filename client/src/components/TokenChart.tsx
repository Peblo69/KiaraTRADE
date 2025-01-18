import { useState, useRef, useEffect, useCallback } from 'react';
import { createChart, ColorType, IChartApi, ISeriesApi } from 'lightweight-charts';
import { Card } from '@/components/ui/card';
import { useTokenPriceStore } from '@/lib/price-history';

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

  // Load initial data once
  useEffect(() => {
    const initialData = useTokenPriceStore.getState().getPriceHistory(tokenAddress, '5m');
    setCandles(initialData);
  }, [tokenAddress]);

  // Initialize chart once
  useEffect(() => {
    if (!chartContainerRef.current || chart.current) return;

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

  // Subscribe to WebSocket for real-time updates
  useEffect(() => {
    const ws = new WebSocket('wss://pumpportal.fun/api/data');

    ws.onmessage = (event) => {
      const trade = JSON.parse(event.data);

      // Only process trades for our token
      if (trade.mint !== tokenAddress) return;

      setCandles(prevCandles => {
        const currentTime = Math.floor(Date.now() / (5 * 60 * 1000)) * (5 * 60 * 1000);
        const currentCandle = prevCandles[prevCandles.length - 1];

        // If this trade belongs to the current candle, update it
        if (currentCandle && Math.floor(currentCandle.timestamp / (5 * 60 * 1000)) === Math.floor(currentTime / (5 * 60 * 1000))) {
          const updatedCandle = {
            ...currentCandle,
            high: Math.max(currentCandle.high, trade.price),
            low: Math.min(currentCandle.low, trade.price),
            close: trade.price,
            volume: currentCandle.volume + trade.volume
          };
          return [...prevCandles.slice(0, -1), updatedCandle];
        }

        // Otherwise create a new candle
        const newCandle = {
          timestamp: currentTime,
          open: trade.price,
          high: trade.price,
          low: trade.price,
          close: trade.price,
          volume: trade.volume
        };
        return [...prevCandles, newCandle];
      });
    };

    return () => ws.close();
  }, [tokenAddress]);

  // Update chart when candles change
  useEffect(() => {
    if (!candlestickSeries.current || !volumeSeries.current || !candles.length) return;

    candlestickSeries.current.setData(
      candles.map(candle => ({
        time: Math.floor(candle.timestamp / 1000),
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close
      }))
    );

    volumeSeries.current.setData(
      candles.map(candle => ({
        time: Math.floor(candle.timestamp / 1000),
        value: candle.volume,
        color: candle.close >= candle.open ? 
          'rgba(38, 166, 154, 0.5)' : 
          'rgba(239, 83, 80, 0.5)'
      }))
    );

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
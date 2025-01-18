import { useState, useRef, useEffect } from 'react';
import { createChart, ColorType, IChartApi, ISeriesApi, Time } from 'lightweight-charts';
import { Card } from '@/components/ui/card';

interface TokenChartProps {
  tokenAddress: string;
  height?: number;
}

interface Candle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export default function TokenChart({ tokenAddress, height = 400 }: TokenChartProps) {
  const [candles, setCandles] = useState<Candle[]>([]);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chart = useRef<IChartApi | null>(null);
  const candlestickSeries = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeSeries = useRef<ISeriesApi<"Histogram"> | null>(null);
  const ws = useRef<WebSocket | null>(null);

  // Load initial data and setup WebSocket
  useEffect(() => {
    console.log('[TokenChart] Loading initial data for token:', tokenAddress);

    // Fetch initial candle data
    fetch(`/api/tokens/${tokenAddress}/candles`)
      .then(res => res.json())
      .then(data => {
        console.log('[TokenChart] Received initial candle data:', data);
        setCandles(data);
      })
      .catch(error => {
        console.error('[TokenChart] Error fetching initial data:', error);
      });

    // Connect to aggregator WebSocket
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;
    console.log('[TokenChart] Connecting to WebSocket:', wsUrl);

    ws.current = new WebSocket(wsUrl);

    ws.current.onopen = () => {
      console.log('[TokenChart] WebSocket connected');
    };

    ws.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('[TokenChart] Received WebSocket message:', data);

        if (data.type === 'candle_update' && data.tokenAddress === tokenAddress) {
          console.log('[TokenChart] Processing candle update:', data.candle);
          setCandles(prevCandles => {
            const updatedCandles = [...prevCandles];
            const existingIndex = updatedCandles.findIndex(
              c => c.timestamp === data.candle.timestamp
            );

            if (existingIndex >= 0) {
              updatedCandles[existingIndex] = data.candle;
            } else {
              updatedCandles.push(data.candle);
            }

            return updatedCandles.sort((a, b) => a.timestamp - b.timestamp);
          });
        }
      } catch (error) {
        console.error('[TokenChart] Error processing WebSocket message:', error);
      }
    };

    ws.current.onerror = (error) => {
      console.error('[TokenChart] WebSocket error:', error);
    };

    ws.current.onclose = () => {
      console.log('[TokenChart] WebSocket connection closed');
    };

    return () => {
      console.log('[TokenChart] Cleaning up WebSocket connection');
      if (ws.current) {
        ws.current.close();
        ws.current = null;
      }
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
      time: candle.timestamp / 1000 as Time,
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close
    }));

    const volumeData = candles.map(candle => ({
      time: candle.timestamp / 1000 as Time,
      value: candle.volume,
      color: candle.close >= candle.open ? 
        'rgba(38, 166, 154, 0.5)' : 
        'rgba(239, 83, 80, 0.5)'
    }));

    candlestickSeries.current.setData(chartData);
    volumeSeries.current.setData(volumeData);

    // Set visible range to last hour
    if (chart.current && candles.length > 0) {
      const lastTimestamp = candles[candles.length - 1].timestamp / 1000;
      chart.current.timeScale().setVisibleRange({
        from: (lastTimestamp - 3600) as Time,
        to: lastTimestamp as Time
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
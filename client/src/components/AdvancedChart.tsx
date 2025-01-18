import { FC, useEffect, useRef, useState } from 'react';
import { createChart, ColorType, IChartApi } from 'lightweight-charts';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ChartProps {
  symbol: string;
  className?: string;
}

type TimeFrame = '1m' | '5m' | '15m' | '30m' | '1h' | '4h' | '1d' | '1w';

export const AdvancedChart: FC<ChartProps> = ({ symbol, className }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<any>(null);
  const volumeSeriesRef = useRef<any>(null);
  const updateIntervalRef = useRef<any>(null);
  const lastKlineRef = useRef<any>(null);
  const [timeframe, setTimeframe] = useState<TimeFrame>('1d');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const handleResize = () => {
      chartRef.current?.applyOptions({
        width: chartContainerRef.current?.clientWidth || 600,
      });
    };

    // Create chart
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#999',
      },
      grid: {
        vertLines: { color: 'rgba(42, 46, 57, 0.1)' },
        horzLines: { color: 'rgba(42, 46, 57, 0.1)' },
      },
      width: chartContainerRef.current.clientWidth,
      height: 400,
      timeScale: {
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
      priceScaleId: '', // Set as an overlay
      scaleMargins: {
        top: 0.8, // Position the volume series at the bottom 20% of the chart
        bottom: 0,
      },
    });

    chartRef.current = chart;
    candlestickSeriesRef.current = candlestickSeries;
    volumeSeriesRef.current = volumeSeries;

    // Load initial chart data
    const loadChartData = async (isUpdate = false) => {
      if (!isUpdate) setIsLoading(true);
      try {
        const response = await fetch(`/api/coins/${symbol}/klines?timeframe=${timeframe}`);
        if (!response.ok) throw new Error('Failed to fetch chart data');

        const data = await response.json();

        if (!data.klines || !data.klines.length) {
          console.warn('No klines data received');
          return;
        }

        // For updates, only add new klines
        if (isUpdate && lastKlineRef.current) {
          const lastTime = lastKlineRef.current.time;
          const newKlines = data.klines.filter((k: any) => k.time > lastTime);

          if (newKlines.length > 0) {
            // Update the last kline (it might have changed)
            candlestickSeriesRef.current.update(data.klines[data.klines.length - 2]);
            // Add the new kline
            candlestickSeriesRef.current.update(data.klines[data.klines.length - 1]);

            // Update volume for the new klines
            const volumeUpdates = newKlines.map((k: any) => ({
              time: k.time,
              value: k.volume,
              color: k.close >= k.open 
                ? 'rgba(38, 166, 154, 0.5)' // Green for up candles
                : 'rgba(239, 83, 80, 0.5)'  // Red for down candles
            }));
            volumeUpdates.forEach(update => volumeSeriesRef.current.update(update));
          }
        } else {
          // Initial load or timeframe change
          candlestickSeriesRef.current.setData(data.klines);

          const volumeData = data.klines.map((k: any) => ({
            time: k.time,
            value: k.volume,
            color: k.close >= k.open 
              ? 'rgba(38, 166, 154, 0.5)' // Green for up candles
              : 'rgba(239, 83, 80, 0.5)'  // Red for down candles
          }));
          volumeSeriesRef.current.setData(volumeData);

          // Fit content on initial load
          chart.timeScale().fitContent();
        }

        // Store the last kline for future updates
        lastKlineRef.current = data.klines[data.klines.length - 1];
      } catch (error) {
        console.error('Failed to load chart data:', error);
      } finally {
        if (!isUpdate) setIsLoading(false);
      }
    };

    // Load initial data
    loadChartData();

    // Set up periodic updates
    const updateInterval = getUpdateInterval(timeframe);
    updateIntervalRef.current = setInterval(() => loadChartData(true), updateInterval);

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }
      chart.remove();
    };
  }, [symbol, timeframe]);

  // Get appropriate update interval based on timeframe
  const getUpdateInterval = (tf: TimeFrame): number => {
    switch (tf) {
      case '1m': return 5000;  // 5 seconds
      case '5m': return 10000; // 10 seconds
      case '15m': return 15000; // 15 seconds
      case '30m': return 20000; // 20 seconds
      case '1h': return 30000; // 30 seconds
      case '4h': return 60000; // 1 minute
      case '1d': return 300000; // 5 minutes
      case '1w': return 900000; // 15 minutes
      default: return 30000;
    }
  };

  const timeframes: { value: TimeFrame; label: string }[] = [
    { value: '1m', label: '1 minute' },
    { value: '5m', label: '5 minutes' },
    { value: '15m', label: '15 minutes' },
    { value: '30m', label: '30 minutes' },
    { value: '1h', label: '1 hour' },
    { value: '4h', label: '4 hours' },
    { value: '1d', label: '1 day' },
    { value: '1w', label: '1 week' },
  ];

  return (
    <Card className={`p-4 ${className}`}>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Price Chart</h3>
        <Select value={timeframe} onValueChange={(value) => setTimeframe(value as TimeFrame)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select timeframe" />
          </SelectTrigger>
          <SelectContent>
            {timeframes.map((tf) => (
              <SelectItem key={tf.value} value={tf.value}>
                {tf.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div ref={chartContainerRef} className="relative">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/50">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        )}
      </div>
    </Card>
  );
};

export default AdvancedChart;
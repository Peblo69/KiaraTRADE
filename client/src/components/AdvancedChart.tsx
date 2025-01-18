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
  const [timeframe, setTimeframe] = useState<TimeFrame>('1m');
  const [isLoading, setIsLoading] = useState(true);

  // Keep references in state to ensure proper cleanup
  const [chart, setChart] = useState<IChartApi | null>(null);
  const [updateInterval, setUpdateInterval] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const container = chartContainerRef.current;
    if (!container) return;

    // Cleanup function
    const cleanup = () => {
      if (updateInterval) {
        clearInterval(updateInterval);
        setUpdateInterval(null);
      }
      if (chart) {
        chart.remove();
        setChart(null);
      }
    };

    // Clean up previous instance
    cleanup();

    // Create new chart
    const newChart = createChart(container, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#999',
      },
      grid: {
        vertLines: { color: 'rgba(42, 46, 57, 0.1)' },
        horzLines: { color: 'rgba(42, 46, 57, 0.1)' },
      },
      width: container.clientWidth,
      height: 400,
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
      },
    });

    const candlestickSeries = newChart.addCandlestickSeries({
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderVisible: false,
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350',
    });

    const volumeSeries = newChart.addHistogramSeries({
      color: '#26a69a',
      priceScaleId: 'volume',
      priceFormat: {
        type: 'volume',
      },
      scaleMargins: {
        top: 0.8,
        bottom: 0,
      },
    });

    setChart(newChart);

    // Function to load and update chart data
    const loadChartData = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/coins/${symbol}/klines?timeframe=${timeframe}`);
        if (!response.ok) throw new Error('Failed to fetch chart data');

        const data = await response.json();
        if (!data.klines || !data.klines.length) {
          console.warn('No klines data received');
          return;
        }

        const candleData = data.klines.map((k: any) => ({
          time: k.time,
          open: k.open,
          high: k.high,
          low: k.low,
          close: k.close
        }));

        const volumeData = data.klines.map((k: any) => ({
          time: k.time,
          value: k.volume,
          color: k.close >= k.open ? 'rgba(38, 166, 154, 0.5)' : 'rgba(239, 83, 80, 0.5)'
        }));

        candlestickSeries.setData(candleData);
        volumeSeries.setData(volumeData);
        newChart.timeScale().fitContent();
      } catch (error) {
        console.error('Failed to load chart data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    // Initial load
    loadChartData();

    // Set up update interval
    const interval = setInterval(loadChartData, 5000);
    setUpdateInterval(interval);

    // Handle resize
    const handleResize = () => {
      if (container) {
        newChart.applyOptions({ width: container.clientWidth });
      }
    };

    window.addEventListener('resize', handleResize);

    // Cleanup on unmount or symbol/timeframe change
    return () => {
      window.removeEventListener('resize', handleResize);
      cleanup();
    };
  }, [symbol, timeframe]); // Dependencies ensure chart recreates when symbol or timeframe changes

  return (
    <Card className={`p-4 ${className}`}>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Price Chart</h3>
        <Select value={timeframe} onValueChange={(value) => setTimeframe(value as TimeFrame)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select timeframe" />
          </SelectTrigger>
          <SelectContent>
            {[
              { value: '1m', label: '1 minute' },
              { value: '5m', label: '5 minutes' },
              { value: '15m', label: '15 minutes' },
              { value: '30m', label: '30 minutes' },
              { value: '1h', label: '1 hour' },
              { value: '4h', label: '4 hours' },
              { value: '1d', label: '1 day' },
              { value: '1w', label: '1 week' },
            ].map((tf) => (
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
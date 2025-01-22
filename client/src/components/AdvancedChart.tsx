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
  const updateIntervalRef = useRef<NodeJS.Timeout | null>(null);
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
      priceScaleId: '',
      scaleMargins: {
        top: 0.8,
        bottom: 0,
      },
    });

    chartRef.current = chart;
    candlestickSeriesRef.current = candlestickSeries;
    volumeSeriesRef.current = volumeSeries;

    // Load chart data with update support
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

        if (isUpdate) {
          // Update only the latest candle
          const latestKline = data.klines[data.klines.length - 1];
          candlestickSeries.update(latestKline);

          // Update volume for the latest candle
          volumeSeries.update({
            time: latestKline.time,
            value: latestKline.volume,
            color: latestKline.close >= latestKline.open 
              ? 'rgba(38, 166, 154, 0.5)' 
              : 'rgba(239, 83, 80, 0.5)'
          });
        } else {
          // Initial load
          candlestickSeries.setData(data.klines);

          const volumeData = data.klines.map((k: any) => ({
            time: k.time,
            value: k.volume,
            color: k.close >= k.open 
              ? 'rgba(38, 166, 154, 0.5)'
              : 'rgba(239, 83, 80, 0.5)'
          }));
          volumeSeries.setData(volumeData);

          // Fit content
          chart.timeScale().fitContent();
        }
      } catch (error) {
        console.error('Failed to load chart data:', error);
      } finally {
        if (!isUpdate) setIsLoading(false);
      }
    };

    // Initial load
    loadChartData();

    // Set up real-time updates only for 1m and 5m timeframes
    if (timeframe === '1m' || timeframe === '5m') {
      updateIntervalRef.current = setInterval(() => loadChartData(true), 5000);
    }

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }
      chart.remove();
    };
  }, [symbol, timeframe]);

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
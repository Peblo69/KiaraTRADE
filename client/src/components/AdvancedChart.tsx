import { FC, useEffect, useRef, useState, useCallback } from 'react';
import { createChart, ColorType, IChartApi, Time } from 'lightweight-charts';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ChartProps {
  data: {
    time: Time;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }[];
  onTimeframeChange?: (timeframe: string) => void;
  timeframe?: string;
  symbol: string;
  className?: string;
}

type TimeFrame = '1m' | '5m' | '15m' | '30m' | '1h' | '4h' | '1d' | '1w';

export const AdvancedChart: FC<ChartProps> = ({ 
  data, 
  onTimeframeChange, 
  timeframe = '1m',
  symbol, 
  className 
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<any>(null);
  const volumeSeriesRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [noDataForTimeframe, setNoDataForTimeframe] = useState(false);

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const handleResize = () => {
      chartRef.current?.applyOptions({
        width: chartContainerRef.current?.clientWidth || 600,
      });
    };

    // Create chart with professional styling
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: 'rgba(255, 255, 255, 0.9)',
      },
      grid: {
        vertLines: { color: 'rgba(42, 46, 57, 0.2)' },
        horzLines: { color: 'rgba(42, 46, 57, 0.2)' },
      },
      width: chartContainerRef.current.clientWidth,
      height: 400,
      timeScale: {
        timeVisible: true,
        secondsVisible: timeframe === '1m',
        tickMarkFormatter: (time: any) => {
          const date = new Date(time * 1000);
          const hours = date.getHours().toString().padStart(2, '0');
          const minutes = date.getMinutes().toString().padStart(2, '0');
          return `${hours}:${minutes}`;
        },
      },
      crosshair: {
        mode: 1,
        vertLine: {
          width: 1,
          color: 'rgba(224, 227, 235, 0.1)',
          style: 0,
        },
        horzLine: {
          width: 1,
          color: 'rgba(224, 227, 235, 0.1)',
          style: 0,
        },
      },
    });

    // Add candlestick series with professional colors
    const candlestickSeries = chart.addCandlestickSeries({
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderVisible: false,
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350',
    });

    // Add volume series with matching colors
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

    // Set initial data
    if (data.length) {
      try {
        // Sort data by time to ensure proper order
        const sortedData = [...data].sort((a, b) => {
          const timeA = typeof a.time === 'number' ? a.time : new Date(a.time as string).getTime();
          const timeB = typeof b.time === 'number' ? b.time : new Date(b.time as string).getTime();
          return timeA - timeB;
        });

        candlestickSeries.setData(sortedData);

        // Create volume data with matching colors
        const volumeData = sortedData.map((d) => ({
          time: d.time,
          value: d.volume,
          color: d.close >= d.open ? 'rgba(38, 166, 154, 0.5)' : 'rgba(239, 83, 80, 0.5)',
        }));
        volumeSeries.setData(volumeData);

        // Fit content and remove loading state
        chart.timeScale().fitContent();
        setIsLoading(false);
        setNoDataForTimeframe(false);
      } catch (error) {
        console.error('Error setting chart data:', error);
        setNoDataForTimeframe(true);
      }
    } else {
      setNoDataForTimeframe(true);
    }

    chartRef.current = chart;
    candlestickSeriesRef.current = candlestickSeries;
    volumeSeriesRef.current = volumeSeries;

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [timeframe]); // Re-initialize chart when timeframe changes

  // Update data in real-time
  useEffect(() => {
    if (!candlestickSeriesRef.current || !volumeSeriesRef.current || !data.length) {
      setNoDataForTimeframe(true);
      return;
    }

    try {
      // Update last candle or add new one
      const lastDataPoint = data[data.length - 1];

      // Validate time data
      const currentTime = typeof lastDataPoint.time === 'number' 
        ? lastDataPoint.time 
        : new Date(lastDataPoint.time as string).getTime();

      if (!currentTime) {
        console.warn('Invalid time data in chart update');
        return;
      }

      candlestickSeriesRef.current.update({
        ...lastDataPoint,
        time: currentTime,
      });

      volumeSeriesRef.current.update({
        time: currentTime,
        value: lastDataPoint.volume,
        color: lastDataPoint.close >= lastDataPoint.open 
          ? 'rgba(38, 166, 154, 0.5)' 
          : 'rgba(239, 83, 80, 0.5)',
      });

      setIsLoading(false);
      setNoDataForTimeframe(false);
    } catch (error) {
      console.error('Error updating chart:', error);
      setNoDataForTimeframe(true);
    }
  }, [data]);

  const handleTimeframeChange = useCallback((newTimeframe: string) => {
    // Reset error state when changing timeframes
    setNoDataForTimeframe(false);
    setIsLoading(true);
    onTimeframeChange?.(newTimeframe);
  }, [onTimeframeChange]);

  return (
    <Card className={`p-4 ${className}`}>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">{symbol} Price Chart</h3>
        <Select value={timeframe} onValueChange={handleTimeframeChange}>
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
        {noDataForTimeframe && !isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/50">
            <div className="text-muted-foreground text-sm">
              No data available for selected timeframe
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};

export default AdvancedChart;
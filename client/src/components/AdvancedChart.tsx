import { FC, useEffect, useRef, useState } from 'react';
import { createChart, ColorType, IChartApi, Time, CrosshairMode, LineStyle } from 'lightweight-charts';
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

export const AdvancedChart: FC<ChartProps> = ({
  data,
  onTimeframeChange,
  timeframe = '1s',
  symbol,
  className,
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<any>(null);
  const volumeSeriesRef = useRef<any>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const handleResize = () => {
      chartRef.current?.applyOptions({
        width: chartContainerRef.current?.clientWidth || 600,
      });
    };

    // Create chart with exact Bullx styling
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#0A0A0A' },
        textColor: '#D9D9D9',
        fontSize: 12,
      },
      grid: {
        vertLines: {
          color: 'rgba(35, 38, 47, 0.1)', // Reduced opacity to match Bullx
          style: LineStyle.Solid,
        },
        horzLines: {
          color: 'rgba(35, 38, 47, 0.1)', // Reduced opacity to match Bullx
          style: LineStyle.Solid,
        },
      },
      width: chartContainerRef.current.clientWidth,
      height: 400,
      rightPriceScale: {
        borderColor: 'rgba(35, 38, 47, 0.6)',
        scaleMargins: {
          top: 0.2,  // Adjusted to match Bullx layout
          bottom: 0.2,
        },
      },
      timeScale: {
        borderColor: 'rgba(35, 38, 47, 0.6)',
        timeVisible: true,
        secondsVisible: true,
        barSpacing: 3, // Tighter spacing like Bullx
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: 'rgba(224, 227, 235, 0.1)',
          style: LineStyle.Solid,
          labelBackgroundColor: '#0A0A0A',
        },
        horzLine: {
          color: 'rgba(224, 227, 235, 0.1)',
          style: LineStyle.Solid,
          labelBackgroundColor: '#0A0A0A',
        },
      },
    });

    // Add candlestick series with exact Bullx colors
    const candlestickSeries = chart.addCandlestickSeries({
      upColor: '#00C805',
      downColor: '#FF3B69',
      borderVisible: false,
      wickUpColor: '#00C805',
      wickDownColor: '#FF3B69',
    });

    // Add volume series with exact Bullx styling
    const volumeSeries = chart.addHistogramSeries({
      priceFormat: {
        type: 'volume',
      },
      priceScaleId: '', // Separate scale for volume
      scaleMargins: {
        top: 0.8,
        bottom: 0,
      },
    });

    if (data.length > 0) {
      // Process and set candlestick data
      candlestickSeries.setData(data);

      // Process volume data with matching candle colors
      const volumeData = data.map(d => ({
        time: d.time,
        value: d.volume,
        color: d.close >= d.open ? 'rgba(0, 200, 5, 0.5)' : 'rgba(255, 59, 105, 0.5)',
      }));
      volumeSeries.setData(volumeData);

      chart.timeScale().fitContent();
      setIsLoading(false);
    }

    chartRef.current = chart;
    candlestickSeriesRef.current = candlestickSeries;
    volumeSeriesRef.current = volumeSeries;

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [data]);

  return (
    <Card className={className}>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">{symbol} Price Chart</h3>
        <Select value={timeframe} onValueChange={onTimeframeChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select timeframe" />
          </SelectTrigger>
          <SelectContent>
            {[
              { value: '1s', label: '1 second' },
              { value: '1m', label: '1 minute' },
              { value: '5m', label: '5 minutes' },
              { value: '15m', label: '15 minutes' },
              { value: '1h', label: '1 hour' },
            ].map((tf) => (
              <SelectItem key={tf.value} value={tf.value}>
                {tf.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div ref={chartContainerRef} className="relative" />
    </Card>
  );
};

export default AdvancedChart;
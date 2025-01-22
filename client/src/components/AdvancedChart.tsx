import { FC, useEffect, useRef, useState } from 'react';
import {
  createChart,
  ColorType,
  IChartApi,
  Time,
  CrosshairMode,
  LineStyle,
  CandlestickData,
  HistogramData,
  Marker,
} from 'lightweight-charts';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";


interface ChartProps {
  data: CandlestickData[];
  onTimeframeChange?: (timeframe: string) => void;
  timeframe?: string;
  symbol: string;
  className?: string;
  recentTrades?: {
    timestamp: number;
    price: number;
    isBuy: boolean;
  }[];
}

export const AdvancedChart: FC<ChartProps> = ({
  data,
  onTimeframeChange,
  timeframe = '1s',
  symbol,
  className,
  recentTrades = [],
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<any>(null);
  const volumeSeriesRef = useRef<any>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#0A0A0A' },
        textColor: '#D9D9D9',
        fontSize: 12,
      },
      grid: {
        vertLines: {
          color: 'rgba(35, 38, 47, 0.1)',
          style: LineStyle.Solid,
        },
        horzLines: {
          color: 'rgba(35, 38, 47, 0.1)',
          style: LineStyle.Solid,
        },
      },
      width: chartContainerRef.current.clientWidth,
      height: 400,
      rightPriceScale: {
        borderColor: 'rgba(35, 38, 47, 0.6)',
        scaleMargins: {
          top: 0.2,
          bottom: 0.2,
        },
      },
      timeScale: {
        borderColor: 'rgba(35, 38, 47, 0.6)',
        timeVisible: true,
        secondsVisible: true,
        barSpacing: 3,
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

    const candlestickSeries = chart.addCandlestickSeries({
      upColor: '#00C805',
      downColor: '#FF3B69',
      borderVisible: false,
      wickUpColor: '#00C805',
      wickDownColor: '#FF3B69',
    });

    const volumeSeries = chart.addHistogramSeries({
      priceFormat: {
        type: 'volume',
      },
      priceScaleId: '',
      scaleMargins: {
        top: 0.8,
        bottom: 0,
      },
    });

    if (data.length > 0) {
      candlestickSeries.setData(data);

      const volumeData = data.map(d => ({
        time: d.time,
        value: d.volume,
        color: d.close >= d.open ? 'rgba(0, 200, 5, 0.5)' : 'rgba(255, 59, 105, 0.5)',
      }));
      volumeSeries.setData(volumeData);

      if (recentTrades.length) {
        const markers = recentTrades.map(trade => ({
          time: Math.floor(trade.timestamp / 1000),
          position: trade.isBuy ? 'belowBar' : 'aboveBar',
          color: trade.isBuy ? '#00C805' : '#FF3B69',
          shape: trade.isBuy ? 'arrowUp' : 'arrowDown',
          text: trade.isBuy ? 'B' : 'S',
          size: 1,
        }));
        candlestickSeries.setMarkers(markers);
      }

      chart.timeScale().fitContent();
      setIsLoading(false);
    }

    chartRef.current = chart;
    candlestickSeriesRef.current = candlestickSeries;
    volumeSeriesRef.current = volumeSeries;

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [data, recentTrades]);

  // Handle timeframe changes
  const handleTimeframeChange = useCallback((newTimeframe: string) => {
    setIsLoading(true);
    onTimeframeChange?.(newTimeframe);
  }, [onTimeframeChange]);

  return (
    <Card className={className}>
      <div className="flex justify-between items-center mb-4 px-4 pt-4">
        <h3 className="text-lg font-semibold">{symbol} Price Chart</h3>
        <Select value={timeframe} onValueChange={handleTimeframeChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select timeframe" />
          </SelectTrigger>
          <SelectContent>
            {[
              { value: '1s', label: '1 Second' },
              { value: '1m', label: '1 Minute' },
              { value: '5m', label: '5 Minutes' },
              { value: '15m', label: '15 Minutes' },
              { value: '1h', label: '1 Hour' },
              { value: '4h', label: '4 Hours' },
              { value: '1d', label: '1 Day' },
              { value: '1w', label: '1 Week' },
            ].map((tf) => (
              <SelectItem key={tf.value} value={tf.value}>
                {tf.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {isLoading ? (
        <div className="flex items-center justify-center h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
        </div>
      ) : (
        <div ref={chartContainerRef} className="w-full h-[400px]" />
      )}
    </Card>
  );
};

export default AdvancedChart;
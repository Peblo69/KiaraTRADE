import { FC, useEffect, useRef, useState, useCallback } from 'react';
import { createChart, ColorType, IChartApi, Time, CrosshairMode } from 'lightweight-charts';
import { Card } from '@/components/ui/card';

interface ChartData {
  time: Time;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface ChartProps {
  data?: ChartData[];
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
  data = [],
  onTimeframeChange,
  timeframe = '1s',
  symbol,
  className,
  recentTrades = [],
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<any>(null);
  const volumeSeriesRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [noDataForTimeframe, setNoDataForTimeframe] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const handleResize = () => {
      chartRef.current?.applyOptions({
        width: chartContainerRef.current?.clientWidth || 600,
      });
    };

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#0A0A0A' },
        textColor: '#D9D9D9',
      },
      grid: {
        vertLines: { color: 'rgba(42, 46, 57, 0.2)' },
        horzLines: { color: 'rgba(42, 46, 57, 0.2)' },
      },
      width: chartContainerRef.current.clientWidth,
      height: 400,
      timeScale: {
        timeVisible: true,
        secondsVisible: true,
        borderColor: 'rgba(197, 203, 206, 0.2)',
        barSpacing: 6,
        minBarSpacing: 4,
        rightOffset: 5,
        fixLeftEdge: false,
        fixRightEdge: false,
        lockVisibleTimeRangeOnResize: false,
        rightBarStaysOnScroll: true,
      },
      rightPriceScale: {
        borderColor: 'rgba(197, 203, 206, 0.2)',
        scaleMargins: {
          top: 0.1,
          bottom: 0.2
        },
        autoScale: true,
      },
      crosshair: {
        mode: CrosshairMode.Normal,
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: true,
      },
      handleScale: {
        axisPressedMouseMove: {
          time: true,
          price: true,
        },
        mouseWheel: true,
        pinch: true,
      },
    });

    const candlestickSeries = chart.addCandlestickSeries({
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderVisible: false,
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444',
      priceFormat: {
        type: 'price',
        precision: 8,
        minMove: 0.00000001,
      },
    });

    const volumeSeries = chart.addHistogramSeries({
      color: 'rgba(76, 175, 80, 0.5)',
      priceFormat: {
        type: 'volume',
      },
      priceScaleId: '',
      scaleMargins: {
        top: 0.8,
        bottom: 0,
      },
    });

    if (Array.isArray(data) && data.length > 0) {
      candlestickSeries.setData(data);
      const volumeData = data.map(d => ({
        time: d.time,
        value: d.volume,
        color: d.close >= d.open ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)',
      }));
      volumeSeries.setData(volumeData);

      // Set visible range to show latest data with some history
      const totalBars = data.length;
      chart.timeScale().setVisibleLogicalRange({
        from: Math.max(0, totalBars - 50),
        to: totalBars + 2,
      });
    }

    chartRef.current = chart;
    candlestickSeriesRef.current = candlestickSeries;
    volumeSeriesRef.current = volumeSeries;

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [timeframe, data]);

  const intervals = [
    { label: '1s', value: '1s' },
    { label: '5s', value: '5s' },
    { label: '15s', value: '15s' },
    { label: '30s', value: '30s' },
    { label: '1m', value: '1m' },
    { label: '10m', value: '10m' },
    { label: '30m', value: '30m' },
    { label: '1h', value: '1h' },
  ];

  return (
    <Card className={className}>
      <div className="flex justify-between items-center p-2">
        <h3 className="text-lg font-semibold">{symbol} Price Chart</h3>
        <div className="flex gap-1">
          {intervals.map((interval) => (
            <button
              key={interval.value}
              onClick={() => onTimeframeChange?.(interval.value)}
              className={`px-2 py-1 text-xs rounded ${
                timeframe === interval.value
                  ? 'bg-purple-500 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {interval.label}
            </button>
          ))}
        </div>
      </div>
      <div ref={chartContainerRef} className="relative bg-[#0A0A0A] rounded-lg">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        )}
        {noDataForTimeframe && !isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10">
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
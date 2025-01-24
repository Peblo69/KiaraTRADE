import { FC, useEffect, useRef, useState, useCallback } from 'react';
import { createChart, ColorType, IChartApi, Time, CrosshairMode } from 'lightweight-charts';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  data = [], // Initialize with empty array as default
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
        rightOffset: 12,
        fixLeftEdge: false,
        fixRightEdge: false,
        lockVisibleTimeRangeOnResize: true,
      },
      rightPriceScale: {
        borderColor: 'rgba(197, 203, 206, 0.2)',
        scaleMargins: {
          top: 0.1,
          bottom: 0.2
        },
        autoScale: true,
        mode: 1,
        alignLabels: true,
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          width: 1,
          color: 'rgba(224, 227, 235, 0.4)',
          style: 0,
        },
        horzLine: {
          width: 1,
          color: 'rgba(224, 227, 235, 0.4)',
          style: 0,
        },
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
      upColor: '#16a34a',
      downColor: '#dc2626',
      borderVisible: true,
      borderUpColor: '#16a34a',
      borderDownColor: '#dc2626',
      wickUpColor: '#16a34a',
      wickDownColor: '#dc2626',
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

    // Only process data if it exists and has items
    if (Array.isArray(data) && data.length > 0) {
      try {
        const sortedData = [...data].sort((a, b) => {
          const timeA = typeof a.time === 'number' ? a.time : new Date(a.time as string).getTime();
          const timeB = typeof b.time === 'number' ? b.time : new Date(b.time as string).getTime();
          return timeA - timeB;
        });

        candlestickSeries.setData(sortedData);

        const volumeData = sortedData.map(d => ({
          time: d.time,
          value: d.volume,
          color: d.close >= d.open ? 'rgba(22, 163, 74, 0.3)' : 'rgba(220, 38, 38, 0.3)',
        }));
        volumeSeries.setData(volumeData);

        const totalBars = sortedData.length;
        const visibleBars = Math.min(20, totalBars);

        chart.timeScale().setVisibleLogicalRange({
          from: totalBars - visibleBars - 10,
          to: totalBars + 5,
        });

        chart.subscribeCrosshairMove(param => {
          const tooltip = tooltipRef.current;
          if (!tooltip) return;

          if (!param.time || !param.point || param.point.x < 0 || param.point.y < 0) {
            tooltip.style.display = 'none';
            return;
          }

          const dataPoint = sortedData.find(d => d.time === param.time);
          if (dataPoint) {
            tooltip.style.display = 'block';
            tooltip.style.left = `${param.point.x}px`;
            tooltip.style.top = `${param.point.y}px`;
            tooltip.innerHTML = `
              <div class="px-2 py-1 bg-background/95 border rounded shadow-lg">
                <div class="grid grid-cols-2 gap-2 text-xs">
                  <div>O: $${dataPoint.open.toFixed(8)}</div>
                  <div>C: $${dataPoint.close.toFixed(8)}</div>
                  <div>H: $${dataPoint.high.toFixed(8)}</div>
                  <div>L: $${dataPoint.low.toFixed(8)}</div>
                  <div class="col-span-2">V: $${dataPoint.volume.toFixed(2)}</div>
                </div>
              </div>
            `;
          }
        });

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
  }, [timeframe, data]);

  useEffect(() => {
    if (!candlestickSeriesRef.current || !volumeSeriesRef.current || !Array.isArray(data) || data.length === 0) {
      setNoDataForTimeframe(true);
      return;
    }

    try {
      const lastDataPoint = data[data.length - 1];
      const currentTime = typeof lastDataPoint.time === 'number'
        ? lastDataPoint.time
        : new Date(lastDataPoint.time as string).getTime() / 1000;

      candlestickSeriesRef.current.update({
        ...lastDataPoint,
        time: currentTime,
      });

      volumeSeriesRef.current.update({
        time: currentTime,
        value: lastDataPoint.volume,
        color: lastDataPoint.close >= lastDataPoint.open
          ? 'rgba(22, 163, 74, 0.3)'
          : 'rgba(220, 38, 38, 0.3)',
      });

      if (Array.isArray(recentTrades) && recentTrades.length > 0) {
        const markers = recentTrades.map(trade => ({
          time: Math.floor(trade.timestamp / 1000),
          position: trade.isBuy ? 'belowBar' : 'aboveBar',
          color: trade.isBuy ? '#16a34a' : '#dc2626',
          shape: trade.isBuy ? 'arrowUp' : 'arrowDown',
          text: trade.isBuy ? 'B' : 'S',
          size: 1
        }));
        candlestickSeriesRef.current.setMarkers(markers);
      }

      setIsLoading(false);
      setNoDataForTimeframe(false);
    } catch (error) {
      console.error('Error updating chart:', error);
      setNoDataForTimeframe(true);
    }
  }, [data, recentTrades]);

  const handleTimeframeChange = useCallback((newTimeframe: string) => {
    setNoDataForTimeframe(false);
    setIsLoading(true);
    onTimeframeChange?.(newTimeframe);
  }, [onTimeframeChange]);

  return (
    <Card className={className}>
      <div className="flex justify-between items-center p-2">
        <h3 className="text-lg font-semibold">{symbol} Price Chart</h3>
        <Select value={timeframe} onValueChange={handleTimeframeChange}>
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="Select timeframe" />
          </SelectTrigger>
          <SelectContent>
            {[
              { value: '1s', label: '1s' },
              { value: '5s', label: '5s' },
              { value: '30s', label: '30s' },
              { value: '1m', label: '1m' },
              { value: '5m', label: '5m' },
              { value: '15m', label: '15m' },
              { value: '1h', label: '1h' },
            ].map((tf) => (
              <SelectItem key={tf.value} value={tf.value}>
                {tf.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div ref={chartContainerRef} className="relative bg-[#0A0A0A] rounded-lg">
        <div
          ref={tooltipRef}
          className="absolute z-50 pointer-events-none hidden"
          style={{ transform: 'translate(-50%, -100%)' }}
        />
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
        <div className="absolute top-4 right-4 flex gap-2">
          {['1s', '5s', '30s', '1m', '5m', '15m', '1h'].map((tf) => (
            <button
              key={tf}
              onClick={() => handleTimeframeChange(tf)}
              className={`px-2 py-1 text-xs rounded ${
                timeframe === tf
                  ? 'bg-purple-500 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>
    </Card>
  );
};

export default AdvancedChart;
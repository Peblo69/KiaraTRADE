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
        vertLines: { color: 'rgba(42, 46, 57, 0.3)' },
        horzLines: { color: 'rgba(42, 46, 57, 0.3)' },
      },
      width: chartContainerRef.current.clientWidth,
      height: 400,
      timeScale: {
        timeVisible: true,
        secondsVisible: true,
        borderColor: 'rgba(197, 203, 206, 0.3)',
        barSpacing: 4, // More compact initial view
        minBarSpacing: 2,
        rightOffset: 5, // Leave space on the right
        visibleRange: {
          from: (Math.floor(Date.now() / 1000) - 300), // Show last 5 minutes by default
          to: Math.floor(Date.now() / 1000)
        }
      },
      rightPriceScale: {
        borderColor: 'rgba(197, 203, 206, 0.3)',
        scaleMargins: {
          top: 0.1, // Keep some space at the top
          bottom: 0.25 // This creates space for volume
        }
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
      },
      handleScale: {
        axisPressedMouseMove: true,
        mouseWheel: true,
        pinch: true,
      },
    });

    const candlestickSeries = chart.addCandlestickSeries({
      upColor: '#00C805',
      downColor: '#FF3B69',
      borderVisible: false,
      wickUpColor: '#00C805',
      wickDownColor: '#FF3B69',
      priceFormat: {
        type: 'price',
        precision: 8,
        minMove: 0.00000001,
      },
    });

    const volumeSeries = chart.addHistogramSeries({
      priceFormat: {
        type: 'volume',
      },
      priceScaleId: '', // Overlay the volume
      scaleMargins: {
        top: 0.8, // Position volume at bottom
        bottom: 0,
      },
    });

    if (data.length) {
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
          color: d.close >= d.open ? 'rgba(0, 200, 5, 0.5)' : 'rgba(255, 59, 105, 0.5)',
        }));
        volumeSeries.setData(volumeData);

        // Subscribe to crosshair move
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

        chartContainerRef.current.addEventListener('mouseleave', () => {
          if (tooltipRef.current) {
            tooltipRef.current.style.display = 'none';
          }
        });

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
  }, [timeframe]);

  useEffect(() => {
    if (!candlestickSeriesRef.current || !volumeSeriesRef.current || !data.length) {
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
          ? 'rgba(0, 200, 5, 0.5)'
          : 'rgba(255, 59, 105, 0.5)',
      });

      if (recentTrades && recentTrades.length > 0) {
        const markers = recentTrades.map(trade => ({
          time: Math.floor(trade.timestamp / 1000),
          position: trade.isBuy ? 'belowBar' : 'aboveBar',
          color: trade.isBuy ? '#00C805' : '#FF3B69',
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
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">{symbol} Price Chart</h3>
        <Select value={timeframe} onValueChange={handleTimeframeChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select timeframe" />
          </SelectTrigger>
          <SelectContent>
            {[
              { value: '1s', label: '1 second' },
              { value: '5s', label: '5 seconds' },
              { value: '30s', label: '30 seconds' },
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
      <div ref={chartContainerRef} className="relative">
        <div
          ref={tooltipRef}
          className="absolute z-50 pointer-events-none hidden"
          style={{ transform: 'translate(-50%, -100%)' }}
        />
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
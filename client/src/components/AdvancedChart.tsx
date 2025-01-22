import { FC, useEffect, useRef, useState, useCallback } from 'react';
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

  // Initialize chart
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
        vertLines: { color: 'rgba(35, 38, 47, 1)' },
        horzLines: { color: 'rgba(35, 38, 47, 1)' },
      },
      width: chartContainerRef.current.clientWidth,
      height: 400,
      timeScale: {
        timeVisible: true,
        secondsVisible: timeframe === '1s' || timeframe === '1m',
        tickMarkFormatter: (time: any) => {
          const date = new Date(time * 1000);
          const hours = date.getHours().toString().padStart(2, '0');
          const minutes = date.getMinutes().toString().padStart(2, '0');
          const seconds = date.getSeconds().toString().padStart(2, '0');
          return timeframe === '1s' ? `${hours}:${minutes}:${seconds}` : `${hours}:${minutes}`;
        },
        borderColor: 'rgba(35, 38, 47, 1)',
      },
      rightPriceScale: {
        borderColor: 'rgba(35, 38, 47, 1)',
        entireTextOnly: true,
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          width: 1,
          color: 'rgba(224, 227, 235, 0.4)',
          style: LineStyle.Solid,
        },
        horzLine: {
          width: 1,
          color: 'rgba(224, 227, 235, 0.4)',
          style: LineStyle.Solid,
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

    // Add candlestick series with exact Bullx colors
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

    // Add volume series with matching colors
    const volumeSeries = chart.addHistogramSeries({
      color: '#26a69a',
      priceFormat: {
        type: 'volume',
      },
      priceScaleId: '', // Overlay with the main chart
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
          color: d.close >= d.open ? 'rgba(0, 200, 5, 0.5)' : 'rgba(255, 59, 105, 0.5)',
        }));
        volumeSeries.setData(volumeData);

        // Set markers for recent trades
        if (recentTrades.length) {
          const markers = recentTrades.map(trade => ({
            time: trade.timestamp,
            position: trade.isBuy ? 'belowBar' : 'aboveBar',
            color: trade.isBuy ? '#00C805' : '#FF3B69',
            shape: trade.isBuy ? 'arrowUp' : 'arrowDown',
            text: trade.isBuy ? 'BUY' : 'SELL'
          }));
          candlestickSeries.setMarkers(markers);
        }

        // Subscribe to crosshair move
        chart.subscribeCrosshairMove(param => {
          if (!param.time || !param.point || param.point.x < 0 || param.point.y < 0) return;

          const dataPoint = sortedData.find(d => d.time === param.time);
          if (dataPoint) {
            const tooltip = document.getElementById('chart-tooltip');
            if (tooltip) {
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
                    <div class="col-span-2">V: ${dataPoint.volume.toFixed(2)} SOL</div>
                  </div>
                </div>
              `;
            }
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

  // Update data in real-time
  useEffect(() => {
    if (!candlestickSeriesRef.current || !volumeSeriesRef.current || !data.length) {
      setNoDataForTimeframe(true);
      return;
    }

    try {
      const lastDataPoint = data[data.length - 1];

      // Validate time data
      const currentTime = typeof lastDataPoint.time === 'number'
        ? lastDataPoint.time
        : new Date(lastDataPoint.time as string).getTime() / 1000;

      if (!currentTime) {
        console.warn('Invalid time data in chart update');
        return;
      }

      candlestickSeriesRef.current.update({
        ...lastDataPoint,
        time: currentTime,
      });

      // Update volume bars with matching colors
      volumeSeriesRef.current.update({
        time: currentTime,
        value: lastDataPoint.volume,
        color: lastDataPoint.close >= lastDataPoint.open
          ? 'rgba(0, 200, 5, 0.5)'
          : 'rgba(255, 59, 105, 0.5)',
      });

      // Update trade markers
      if (recentTrades && recentTrades.length > 0) {
        const markers = recentTrades.map(trade => ({
          time: trade.timestamp,
          position: trade.isBuy ? 'belowBar' : 'aboveBar',
          color: trade.isBuy ? '#00C805' : '#FF3B69',
          shape: trade.isBuy ? 'arrowUp' : 'arrowDown',
          text: trade.isBuy ? 'BUY' : 'SELL'
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
        <div
          id="chart-tooltip"
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
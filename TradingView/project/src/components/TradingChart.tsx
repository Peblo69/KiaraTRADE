import React, { useEffect, useRef } from 'react';
import { LineChart } from 'lucide-react';
import { createChart, IChartApi, ColorType } from 'lightweight-charts';

interface Props {
  tokenAddress: string;
  data?: {
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }[];
  timeframe?: string;
}

export const TradingChart: React.FC<Props> = ({
  tokenAddress,
  data = [],
  timeframe = '1m'
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Create chart with recommended settings
    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#161b2b' },
        textColor: '#d1d4dc',
      },
      grid: {
        vertLines: { color: 'rgba(42, 46, 57, 0.2)' },
        horzLines: { color: 'rgba(42, 46, 57, 0.2)' },
      },
      width: containerRef.current.clientWidth,
      height: 500,
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        tickMarkFormatter: (time: number) => {
          const date = new Date(time * 1000);
          return date.toLocaleTimeString();
        },
      },
      rightPriceScale: {
        borderColor: '#485c7b',
        scaleMargins: {
          top: 0.1,
          bottom: 0.2,
        },
      },
      crosshair: {
        vertLine: {
          color: '#758696',
          width: 1,
          labelBackgroundColor: '#161b2b',
        },
        horzLine: {
          color: '#758696',
          width: 1,
          labelBackgroundColor: '#161b2b',
        },
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

    // Add volume histogram
    const volumeSeries = chart.addHistogramSeries({
      color: '#385263',
      priceFormat: {
        type: 'volume',
      },
      priceScaleId: '', // Set to empty to overlay on the main chart
      scaleMargins: {
        top: 0.8, // Place volume at the bottom 20% of the chart
        bottom: 0,
      },
    });

    // Set data if available
    if (data.length > 0) {
      candlestickSeries.setData(data);
      volumeSeries.setData(data);
      chart.timeScale().fitContent();
    }

    // Handle resize events
    const handleResize = () => {
      if (containerRef.current) {
        chart.applyOptions({
          width: containerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener('resize', handleResize);

    // Store cleanup function
    cleanupRef.current = () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };

    // Store chart reference
    chartRef.current = chart;

    return () => cleanupRef.current?.();
  }, [tokenAddress, data]);

  return (
    <div className="w-full h-full bg-[#161b2b] rounded-lg overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-purple-900/30">
        <div className="flex items-center space-x-2">
          <LineChart className="w-5 h-5 text-purple-400" />
          <h2 className="text-purple-100 font-semibold">
            Price Chart
          </h2>
        </div>
      </div>
      <div 
        ref={containerRef}
        className="w-full h-[500px]"
      />
    </div>
  );
};

export default TradingChart;
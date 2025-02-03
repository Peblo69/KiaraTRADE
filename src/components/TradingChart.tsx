import React, { useEffect, useRef } from 'react';
import { createChart, IChartApi, ColorType } from 'lightweight-charts';
import { useChartData } from '@/hooks/useChartData';

interface Props {
  tokenAddress: string;
}

const TradingChart: React.FC<Props> = ({ tokenAddress }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<any>(null);

  // Use our simplified chart data hook
  const { candles, currentPrice } = useChartData(tokenAddress);

  // Initialize chart
  useEffect(() => {
    if (!containerRef.current) {
      console.warn('Chart container not ready');
      return;
    }

    try {
      console.log('Initializing chart...');
      const chart = createChart(containerRef.current, {
        layout: {
          background: { type: ColorType.Solid, color: '#161b2b' },
          textColor: '#d1d4dc',
        },
        width: containerRef.current.clientWidth,
        height: 400,
        rightPriceScale: {
          borderVisible: false,
        },
        timeScale: {
          borderVisible: false,
          timeVisible: true,
          secondsVisible: true,
        },
        grid: {
          vertLines: { color: 'rgba(42, 46, 57, 0.5)' },
          horzLines: { color: 'rgba(42, 46, 57, 0.5)' },
        },
      });

      const candleSeries = chart.addCandlestickSeries({
        upColor: '#26a69a',
        downColor: '#ef5350',
        borderVisible: true,
        wickUpColor: '#26a69a',
        wickDownColor: '#ef5350',
      });

      chartRef.current = chart;
      candleSeriesRef.current = candleSeries;
      console.log('Chart initialized successfully');

      return () => {
        console.log('Cleaning up chart...');
        chart.remove();
      };
    } catch (error) {
      console.error('Error initializing chart:', error);
    }
  }, []);

  // Update data
  useEffect(() => {
    if (!candleSeriesRef.current || !chartRef.current) {
      console.warn('Chart refs not ready');
      return;
    }

    if (!candles.length) {
      console.warn('No candle data available');
      return;
    }

    try {
      console.log('Updating chart data...', {
        candlesCount: candles.length,
        latestCandle: candles[candles.length - 1]
      });

      candleSeriesRef.current.setData(candles);
      chartRef.current.timeScale().fitContent();
    } catch (error) {
      console.error('Error updating chart data:', error);
    }
  }, [candles]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current && chartRef.current) {
        try {
          chartRef.current.applyOptions({
            width: containerRef.current.clientWidth,
          });
        } catch (error) {
          console.error('Error resizing chart:', error);
        }
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="w-full h-full bg-[#161b2b] rounded-lg overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-purple-900/30">
        <h2 className="text-purple-100 font-semibold">Price Chart</h2>
        <div className="text-sm text-purple-200">
          Current Price: ${currentPrice.toFixed(8)}
        </div>
      </div>
      <div ref={containerRef} className="w-full h-[400px]" />
    </div>
  );
};

export default TradingChart;
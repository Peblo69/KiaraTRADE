import React, { useEffect, useRef } from 'react';
import { createChart, IChartApi } from 'lightweight-charts';
import { LineChart } from 'lucide-react';

const TradingChart: React.FC = () => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<any>(null);

  // Mock data with non-zero values
  const initialData = [
    { time: '2024-01-01', open: 167.89, high: 169.42, low: 165.76, close: 168.23 },
    { time: '2024-01-02', open: 168.23, high: 171.54, low: 167.95, close: 170.89 },
    { time: '2024-01-03', open: 170.89, high: 172.15, low: 169.45, close: 171.23 },
    { time: '2024-01-04', open: 171.23, high: 173.89, low: 170.67, close: 172.45 },
    { time: '2024-01-05', open: 172.45, high: 175.23, low: 171.98, close: 174.67 }
  ];

  useEffect(() => {
    if (!chartContainerRef.current || chartRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { color: '#0D0B1F' },
        textColor: '#d1d4dc',
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
      },
    });

    const candleSeries = chart.addCandlestickSeries({
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderUpColor: '#26a69a',
      borderDownColor: '#ef5350',
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350',
    });

    candleSeries.setData(initialData);

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;

    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
      chartRef.current = null;
    };
  }, []);

  return (
    <div className="relative bg-[#0D0B1F] rounded-lg p-4 border border-purple-900/30">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <LineChart className="w-5 h-5 text-purple-400" />
          <h2 className="text-purple-100 font-semibold">Price Chart</h2>
        </div>
      </div>
      <div ref={chartContainerRef} className="h-[400px]" />
    </div>
  );
};

export default TradingChart;
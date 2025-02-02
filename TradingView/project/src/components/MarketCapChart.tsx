import React, { useEffect, useRef } from 'react';
import { createChart, IChartApi, CandlestickSeries } from 'lightweight-charts';

interface MarketCapChartProps {
  tokenAddress: string;
}

const MarketCapChart: React.FC<MarketCapChartProps> = ({ tokenAddress }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Initialize chart
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { color: '#0D0B1F' },
        textColor: '#d1d5db',
      },
      width: chartContainerRef.current.clientWidth,
      height: 400,
      rightPriceScale: {
        visible: true,
        borderColor: '#2c2c3d',
      },
      leftPriceScale: {
        visible: false,
      },
      grid: {
        vertLines: {
          color: 'rgba(42, 46, 57, 0.5)',
        },
        horzLines: {
          color: 'rgba(42, 46, 57, 0.5)',
        },
      },
      timeScale: {
        borderColor: '#2c2c3d',
        timeVisible: true,
        secondsVisible: false,
      },
      crosshair: {
        mode: 0,
        vertLine: {
          color: '#6b7280',
          width: 1,
          style: 1,
          visible: true,
          labelVisible: true,
        },
        horzLine: {
          color: '#6b7280',
          width: 1,
          style: 1,
          visible: true,
          labelVisible: true,
        },
      },
    });

    // Add market cap series
    const candlestickSeries = chart.addCandlestickSeries({
      upColor: '#4caf50',
      downColor: '#ef5350',
      borderVisible: false,
      wickUpColor: '#4caf50',
      wickDownColor: '#ef5350',
    });

    // Sample data - replace with real market cap data from your store
    const sampleData = [
      { time: '2024-02-01', open: 100, high: 120, low: 90, close: 110 },
      { time: '2024-02-02', open: 110, high: 130, low: 100, close: 120 },
      { time: '2024-02-03', open: 120, high: 140, low: 110, close: 115 },
      { time: '2024-02-04', open: 115, high: 125, low: 105, close: 95 },
      { time: '2024-02-05', open: 95, high: 115, low: 85, close: 105 }
    ];

    candlestickSeries.setData(sampleData);

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current && chart) {
        chart.applyOptions({ 
          width: chartContainerRef.current.clientWidth 
        });
      }
    };

    window.addEventListener('resize', handleResize);

    // Store chart reference
    chartRef.current = chart;

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [tokenAddress]); // Re-run when token changes

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-purple-100">Market Cap Chart</h2>
      </div>
      <div ref={chartContainerRef} className="w-full h-[400px]" />
    </div>
  );
};

export default MarketCapChart;
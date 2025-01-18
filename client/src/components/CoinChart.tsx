import { FC, useEffect, useRef } from 'react';
import { createChart, ColorType, IChartApi, Time } from 'lightweight-charts';

interface CoinChartProps {
  prices: Array<number[]>; // Array of [timestamp, price] pairs
  theme?: 'light' | 'dark';
}

const CoinChart: FC<CoinChartProps> = ({ prices, theme = 'dark' }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Chart configuration
    const chartOptions = {
      layout: {
        background: { color: 'transparent' },
        textColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.9)',
      },
      grid: {
        vertLines: { color: theme === 'dark' ? 'rgba(197, 203, 206, 0.1)' : 'rgba(197, 203, 206, 0.2)' },
        horzLines: { color: theme === 'dark' ? 'rgba(197, 203, 206, 0.1)' : 'rgba(197, 203, 206, 0.2)' },
      },
      width: chartContainerRef.current.clientWidth,
      height: 400,
    };

    // Create chart instance
    const chart = createChart(chartContainerRef.current, chartOptions);
    chartRef.current = chart;

    // Add area series
    const areaSeries = chart.addAreaSeries({
      lineColor: '#8b5cf6', // Purple color matching our theme
      topColor: 'rgba(139, 92, 246, 0.4)',
      bottomColor: 'rgba(139, 92, 246, 0.0)',
      lineWidth: 2,
    });

    // Format data for the chart
    const formattedData = prices.map(([timestamp, price]) => ({
      time: timestamp / 1000 as Time, // Convert milliseconds to seconds and cast as Time
      value: price,
    }));

    areaSeries.setData(formattedData);

    // Fit content
    chart.timeScale().fitContent();

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [prices, theme]);

  return (
    <div 
      ref={chartContainerRef} 
      className="w-full h-[400px] rounded-lg overflow-hidden"
    />
  );
};

export default CoinChart;
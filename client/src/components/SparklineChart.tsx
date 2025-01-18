import { FC, useEffect, useRef, useState } from 'react';
import { createChart, ColorType, IChartApi } from 'lightweight-charts';

interface SparklineProps {
  symbol: string;
  color: string;
  className?: string;
  height?: number;
}

export const SparklineChart: FC<SparklineProps> = ({ 
  symbol,
  color,
  className = '',
  height = 30
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Create chart
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: 'transparent',
      },
      width: 80,
      height: height,
      rightPriceScale: {
        visible: false,
      },
      timeScale: {
        visible: false,
        fixLeftEdge: true,
        fixRightEdge: true,
      },
      grid: {
        vertLines: { visible: false },
        horzLines: { visible: false },
      },
      crosshair: {
        mode: 0,
      },
      handleScroll: false,
      handleScale: false,
    });

    // Add area series
    const areaSeries = chart.addAreaSeries({
      lineColor: color,
      topColor: `${color}20`,
      bottomColor: `${color}05`,
      lineWidth: 1,
      priceLineVisible: false,
      crosshairMarkerVisible: false,
      lastValueVisible: false,
    });

    chartRef.current = chart;

    // Load chart data
    const loadChartData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await fetch(`/api/coins/${symbol}/klines?timeframe=5m`);
        if (!response.ok) throw new Error('Failed to fetch chart data');

        const data = await response.json();
        if (!data.klines || !data.klines.length) {
          throw new Error('No data available');
        }

        // Format data for area series
        const chartData = data.klines.map((k: any) => ({
          time: k.time,
          value: parseFloat(k.close),
        }));

        areaSeries.setData(chartData);
        chart.timeScale().fitContent();
      } catch (error) {
        console.error('Failed to load sparkline data:', error);
        setError(error instanceof Error ? error.message : 'Failed to load chart');
      } finally {
        setIsLoading(false);
      }
    };

    loadChartData();

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
  }, [symbol, color, height]);

  if (error) {
    return <div className={`inline-block ${className}`} style={{ width: '80px', height: `${height}px` }} />;
  }

  return (
    <div ref={chartContainerRef} className={`inline-block relative ${className}`}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-3 h-3 border-2 border-t-transparent border-primary rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
};

export default SparklineChart;
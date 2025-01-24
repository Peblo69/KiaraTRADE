import { FC, useEffect, useRef, useState, memo } from 'react';
import { createChart, ColorType, IChartApi } from 'lightweight-charts';

interface SparklineProps {
  symbol: string;
  color: string;
  className?: string;
  height?: number;
}

const SparklineChartBase: FC<SparklineProps> = ({ 
  symbol,
  color,
  className = '',
  height = 30
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const resizeObserver = useRef<ResizeObserver | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Cleanup function
    const cleanup = () => {
      if (resizeObserver.current) {
        resizeObserver.current.disconnect();
        resizeObserver.current = null;
      }
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };

    try {
      // Create chart with optimized options
      const chart = createChart(chartContainerRef.current, {
        layout: {
          background: { type: ColorType.Solid, color: 'transparent' },
          textColor: 'transparent',
        },
        width: chartContainerRef.current.clientWidth,
        height: height,
        rightPriceScale: { visible: false },
        timeScale: {
          visible: false,
          fixLeftEdge: true,
          fixRightEdge: true,
        },
        grid: {
          vertLines: { visible: false },
          horzLines: { visible: false },
        },
        crosshair: { mode: 0 },
        handleScroll: false,
        handleScale: false,
      });

      // Add area series with optimized settings
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

      // Load chart data with error handling
      const loadChartData = async () => {
        try {
          setIsLoading(true);
          setError(null);
          const response = await fetch(`/api/coins/${symbol}/klines?timeframe=5m`, {
            signal: AbortSignal.timeout(5000) // 5 second timeout
          });

          if (!response.ok) {
            throw new Error('Failed to fetch chart data');
          }

          const data = await response.json();
          if (!data?.klines?.length) {
            throw new Error('No data available');
          }

          // Format data with validation
          const chartData = data.klines
            .filter((k: any) => k?.time && !isNaN(k?.close))
            .map((k: any) => ({
              time: k.time,
              value: parseFloat(k.close),
            }));

          if (chartData.length === 0) {
            throw new Error('No valid data points');
          }

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

      // Use ResizeObserver for efficient resize handling
      resizeObserver.current = new ResizeObserver(entries => {
        if (entries[0]?.contentRect) {
          const { width } = entries[0].contentRect;
          chart.applyOptions({ width });
        }
      });

      resizeObserver.current.observe(chartContainerRef.current);

    } catch (error) {
      console.error('Chart initialization error:', error);
      setError('Failed to initialize chart');
      setIsLoading(false);
    }

    return cleanup;
  }, [symbol, color, height]);

  // Return empty div on error to maintain layout
  if (error) {
    return (
      <div 
        className={`inline-block ${className}`} 
        style={{ width: '80px', height: `${height}px` }} 
      />
    );
  }

  return (
    <div className="relative inline-block">
      {/* Chart container */}
      <div ref={chartContainerRef} className={`relative ${className}`}>
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-3 h-3 border-2 border-t-transparent border-primary rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* Logo overlay */}
      <div 
        className="absolute bottom-0 right-0 bg-background text-xs px-1"
        style={{ 
          fontSize: '9px',
          lineHeight: '12px',
          zIndex: 2,
          backgroundColor: 'hsl(var(--card))',
          borderLeft: '1px solid hsl(var(--border))',
          borderTop: '1px solid hsl(var(--border))',
          borderTopLeftRadius: '4px',
          padding: '3px 6px',
          minWidth: '48px',
          textAlign: 'center',
          fontWeight: '500',
          letterSpacing: '0.02em',
          transform: 'translateY(-1px)'
        }}
      >
        KIARA VISION
      </div>
    </div>
  );
};

export const SparklineChart = memo(SparklineChartBase);
export default SparklineChart;
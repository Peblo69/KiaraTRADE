import React, { useEffect, useState, useRef } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  TimeScale,
  Tooltip,
  Legend,
} from 'chart.js';
import { Chart } from 'react-chartjs-2';
import 'chartjs-adapter-date-fns';
import 'chartjs-chart-financial';
import usePumpPortalChartData from '@/hooks/usePumpPortalChartData';

// Register required components
ChartJS.register(
  CategoryScale,
  LinearScale,
  TimeScale,
  Tooltip,
  Legend
);

interface Props {
  tokenAddress: string;
  className?: string;
}

const TradingChartChartJS: React.FC<Props> = ({ tokenAddress, className }) => {
  const chartInstanceRef = useRef<ChartJS | null>(null);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const { candles, currentPrice } = usePumpPortalChartData(tokenAddress, 60);
  const [isChartReady, setIsChartReady] = useState(false);

  // Cleanup function to destroy chart instance
  const destroyChart = () => {
    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
      chartInstanceRef.current = null;
    }
  };

  // Initial chart setup and cleanup
  useEffect(() => {
    setIsChartReady(false);
    return () => {
      destroyChart();
    };
  }, []);

  // Handle token changes
  useEffect(() => {
    destroyChart();
    setIsChartReady(true);
  }, [tokenAddress]);

  // Prepare chart data
  const chartData = {
    datasets: candles.length ? [{
      label: 'Price',
      data: candles.map(candle => ({
        x: candle.time * 1000,
        o: candle.open,
        h: candle.high,
        l: candle.low,
        c: candle.close
      })),
      borderColor: '#4CAF50',
      backgroundColor: (ctx: any) => {
        const item = ctx.raw;
        return item?.o <= item?.c ? 'rgba(76, 175, 80, 0.5)' : 'rgba(244, 67, 54, 0.5)';
      },
      borderWidth: 1,
    }] : []
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 0
    },
    scales: {
      x: {
        type: 'time' as const,
        time: {
          unit: 'minute' as const,
          displayFormats: {
            minute: 'HH:mm'
          }
        },
        ticks: {
          color: '#9CA3AF',
          maxRotation: 0
        },
        grid: {
          display: false
        }
      },
      y: {
        position: 'right' as const,
        ticks: {
          color: '#9CA3AF',
        },
        grid: {
          color: 'rgba(31, 41, 55, 0.5)'
        }
      }
    },
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        callbacks: {
          label: (ctx: any) => {
            const point = ctx.raw;
            return [
              `Open: $${point.o.toFixed(8)}`,
              `High: $${point.h.toFixed(8)}`,
              `Low: $${point.l.toFixed(8)}`,
              `Close: $${point.c.toFixed(8)}`
            ];
          }
        },
        backgroundColor: 'rgba(13, 11, 31, 0.9)',
        titleColor: '#9CA3AF',
        bodyColor: '#9CA3AF',
        borderColor: 'rgba(147, 51, 234, 0.3)',
        borderWidth: 1
      }
    },
    interaction: {
      intersect: false,
      mode: 'nearest' as const
    }
  };

  if (!isChartReady || !candles.length) {
    return (
      <div className="h-[400px] flex items-center justify-center text-gray-400">
        Loading chart data...
      </div>
    );
  }

  return (
    <div 
      ref={chartContainerRef}
      className={`relative h-[400px] bg-[#0D0B1F] rounded-lg border border-purple-900/30 p-4 ${className}`}
    >
      <Chart
        type="candlestick"
        data={chartData}
        options={options}
        ref={(instance) => {
          // Only set the ref if it's a new instance
          if (instance && instance !== chartInstanceRef.current) {
            destroyChart(); // Ensure old instance is destroyed
            chartInstanceRef.current = instance;
          }
        }}
      />
      <div className="absolute bottom-4 right-4 text-sm font-medium text-green-400">
        ${currentPrice.toFixed(8)}
      </div>
    </div>
  );
};

export default TradingChartChartJS;
// src/components/TradingChartChartJS.tsx
import React, { useEffect, useState } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, TimeScale, Tooltip, Legend } from 'chart.js';
import 'chartjs-chart-financial';
import { Chart } from 'react-chartjs-2';
import 'chartjs-adapter-date-fns';
import usePumpPortalChartData from '@/hooks/usePumpPortalChartData';

ChartJS.register(CategoryScale, LinearScale, TimeScale, Tooltip, Legend);

interface CandlestickData {
  time: number; // UNIX timestamp in seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface Props {
  tokenAddress: string;
  className?: string;
}

const TradingChartChartJS: React.FC<Props> = ({ tokenAddress, className }) => {
  // Use our custom hook to get processed candlestick data from PumpPortal store.
  const { candles, currentPrice } = usePumpPortalChartData(tokenAddress, 60);
  const [chartData, setChartData] = useState<any>(null);

  // Whenever the candles change, update the chartData object.
  useEffect(() => {
    if (candles.length > 0) {
      const data = {
        datasets: [
          {
            label: 'Candlestick Chart',
            data: candles.map((c: CandlestickData) => ({
              x: c.time * 1000, // convert seconds to milliseconds for Chart.js
              o: c.open,
              h: c.high,
              l: c.low,
              c: c.close,
            })),
            borderColor: '#4CAF50',
            backgroundColor: (ctx: any) => {
              const item = ctx.raw;
              return item.o <= item.c
                ? 'rgba(76, 175, 80, 0.5)'
                : 'rgba(244, 67, 54, 0.5)';
            },
            borderWidth: 1,
          },
        ],
      };
      setChartData(data);
    }
  }, [candles]);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 0,
    },
    scales: {
      x: {
        type: 'time' as const,
        time: {
          unit: 'minute' as const,
          displayFormats: {
            minute: 'HH:mm',
          },
        },
        ticks: {
          color: '#9CA3AF',
          maxRotation: 0,
        },
        grid: {
          display: false,
        },
      },
      y: {
        position: 'right' as const,
        ticks: {
          color: '#9CA3AF',
        },
        grid: {
          color: 'rgba(31, 41, 55, 0.5)',
        },
      },
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: (ctx: any) => {
            const { o, h, l, c } = ctx.raw;
            return [`Open: $${o.toFixed(8)}`, `High: $${h.toFixed(8)}`, `Low: $${l.toFixed(8)}`, `Close: $${c.toFixed(8)}`];
          },
        },
        backgroundColor: 'rgba(13, 11, 31, 0.9)',
        titleColor: '#9CA3AF',
        bodyColor: '#9CA3AF',
        borderColor: 'rgba(147, 51, 234, 0.3)',
        borderWidth: 1,
      },
    },
    interaction: {
      intersect: false,
      mode: 'nearest' as const,
    },
  };

  // If no chartData is available, show a loading message.
  if (!chartData) {
    return (
      <div className="h-[400px] flex items-center justify-center text-gray-400">
        Loading chart data...
      </div>
    );
  }

  // By giving Chart a unique key based on the chartData JSON, we force React to re-create the canvas
  // whenever the data changes, preventing the "Canvas is already in use" error.
  const chartKey = JSON.stringify(chartData);

  return (
    <div className={`relative h-[400px] bg-[#0D0B1F] rounded-lg border border-purple-900/30 p-4 ${className}`}>
      <Chart type="candlestick" data={chartData} options={options} key={chartKey} />
      <div className="absolute bottom-4 right-4 text-sm font-medium text-green-400">
        ${currentPrice.toFixed(8)}
      </div>
    </div>
  );
};

export default TradingChartChartJS;

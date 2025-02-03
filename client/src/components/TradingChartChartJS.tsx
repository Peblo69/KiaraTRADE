import React, { useEffect, useState, useRef } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  TimeScale,
  Tooltip,
  Legend,
  ChartOptions
} from 'chart.js';
import 'chartjs-chart-financial';
import { Chart } from 'react-chartjs-2';
import 'chartjs-adapter-date-fns';
import usePumpPortalChartData from '@/hooks/usePumpPortalChartData';

ChartJS.register(CategoryScale, LinearScale, TimeScale, Tooltip, Legend);

interface CandlestickData {
  time: number;
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
  const { candles, currentPrice } = usePumpPortalChartData(tokenAddress, 60);
  const [chartKey, setChartKey] = useState(Date.now());

  const chartData = {
    datasets: [
      {
        label: 'Price',
        data: candles.map((c: CandlestickData) => ({
          x: c.time * 1000, // Convert seconds to milliseconds for Chart.js
          o: c.open,
          h: c.high,
          l: c.low,
          c: c.close,
        })),
        borderColor: '#4CAF50',
        color: {
          up: '#4CAF50',
          down: '#F44336',
          unchanged: '#9E9E9E',
        },
      },
    ],
  };

  const options: ChartOptions<'candlestick'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const { o, h, l, c } = context.raw;
            return [
              `Open: $${o.toFixed(8)}`,
              `High: $${h.toFixed(8)}`,
              `Low: $${l.toFixed(8)}`,
              `Close: $${c.toFixed(8)}`,
            ];
          },
        },
      },
      legend: {
        display: false,
      },
    },
    scales: {
      x: {
        type: 'time',
        time: {
          unit: 'minute',
          displayFormats: {
            minute: 'HH:mm',
          },
        },
        grid: {
          display: false,
        },
        ticks: {
          color: '#9CA3AF',
        },
      },
      y: {
        grid: {
          color: '#1F2937',
        },
        ticks: {
          color: '#9CA3AF',
        },
      },
    },
  };

  // Update chart key when candles change to force remount
  useEffect(() => {
    setChartKey(Date.now());
  }, [candles]);

  if (!chartData.datasets[0].data.length) {
    return <div className="flex items-center justify-center h-[300px]">Loading chart...</div>;
  }

  return (
    <div className={`relative h-[300px] bg-[#0D0B1F] rounded-lg border border-purple-900/30 ${className}`}>
      <Chart 
        key={chartKey}
        type="candlestick" 
        data={chartData} 
        options={options} 
      />
      <div className="absolute bottom-2 right-2 text-sm text-green-400">
        ${currentPrice.toFixed(8)}
      </div>
    </div>
  );
};

export default TradingChartChartJS;
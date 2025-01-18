import React, { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Card } from '@/components/ui/card';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface CandleData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  marketCap: number;
  trades: number;
}

interface TokenChartProps {
  tokenAddress: string;
  height?: number;
}

const TokenChart: React.FC<TokenChartProps> = ({ tokenAddress, height = 400 }) => {
  const [chartData, setChartData] = useState<CandleData[]>([]);

  // Fetch data once on mount and when tokenAddress changes
  useEffect(() => {
    let isMounted = true;

    async function fetchChartData() {
      try {
        // For now using mock data, replace with actual API call
        const mockData: CandleData[] = Array.from({ length: 24 }, (_, i) => ({
          timestamp: Date.now() - i * 3600000,
          open: 100 + Math.random() * 10,
          high: 110 + Math.random() * 10,
          low: 90 + Math.random() * 10,
          close: 105 + Math.random() * 10,
          volume: 1000 + Math.random() * 500,
          marketCap: 1000000 + Math.random() * 50000,
          trades: 50 + Math.floor(Math.random() * 20)
        })).reverse();

        if (isMounted) {
          setChartData(mockData);
        }
      } catch (err) {
        console.error('Failed to fetch chart data:', err);
      }
    }

    fetchChartData();

    return () => {
      isMounted = false;
    };
  }, [tokenAddress]);

  const data = {
    labels: chartData.map(c => new Date(c.timestamp).toLocaleTimeString()),
    datasets: [
      {
        label: 'Price',
        data: chartData.map(c => c.close),
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.5)',
        tension: 0.1
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        display: true,
        position: 'top' as const,
        labels: {
          color: '#D9D9D9'
        }
      },
      tooltip: {
        enabled: true
      }
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(42, 46, 57, 0.3)'
        },
        ticks: {
          color: '#D9D9D9'
        }
      },
      y: {
        grid: {
          color: 'rgba(42, 46, 57, 0.3)'
        },
        ticks: {
          color: '#D9D9D9'
        }
      }
    }
  };

  return (
    <Card className="p-4 bg-black/40 backdrop-blur-lg border border-gray-800">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-white">Price Chart</h3>
      </div>
      <div style={{ height: `${height}px` }}>
        <Line data={data} options={options} />
      </div>
    </Card>
  );
};

export default TokenChart;
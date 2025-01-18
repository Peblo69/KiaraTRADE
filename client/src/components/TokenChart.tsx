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
  Legend,
  Filler
} from 'chart.js';

// Register ChartJS components including Filler for area charts
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
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

  useEffect(() => {
    let isMounted = true;

    async function fetchChartData() {
      try {
        // Mock data with more realistic price movements
        const mockData: CandleData[] = Array.from({ length: 100 }, (_, i) => {
          const basePrice = 100;
          const noise = Math.sin(i * 0.1) * 20 + Math.random() * 10;
          const price = basePrice + noise;
          return {
            timestamp: Date.now() - (100 - i) * 3600000,
            open: price - 1,
            high: price + 2,
            low: price - 2,
            close: price,
            volume: 1000 + Math.random() * 5000,
            marketCap: 1000000 + price * 10000,
            trades: 50 + Math.floor(Math.random() * 100)
          };
        });

        if (isMounted) {
          setChartData(mockData);
        }
      } catch (err) {
        console.error('Failed to fetch chart data:', err);
      }
    }

    fetchChartData();
    return () => { isMounted = false; };
  }, [tokenAddress]);

  const data = {
    labels: chartData.map(c => {
      const date = new Date(c.timestamp);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }),
    datasets: [
      {
        label: 'Price',
        data: chartData.map(c => c.close),
        borderColor: 'rgba(32, 214, 255, 1)',
        borderWidth: 2,
        backgroundColor: (context: any) => {
          const ctx = context.chart.ctx;
          const gradient = ctx.createLinearGradient(0, 0, 0, 300);
          gradient.addColorStop(0, 'rgba(32, 214, 255, 0.2)');
          gradient.addColorStop(1, 'rgba(32, 214, 255, 0)');
          return gradient;
        },
        pointRadius: 0,
        pointHitRadius: 20,
        tension: 0.4,
        fill: true,
        cubicInterpolationMode: 'monotone'
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 750,
      easing: 'easeInOutQuart'
    },
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        enabled: true,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#fff',
        bodyColor: '#fff',
        bodyFont: {
          size: 13
        },
        padding: 12,
        displayColors: false,
        callbacks: {
          label: function(context: any) {
            return `Price: $${context.parsed.y.toFixed(2)}`;
          }
        }
      }
    },
    scales: {
      x: {
        grid: {
          display: false
        },
        ticks: {
          color: 'rgba(255, 255, 255, 0.5)',
          font: {
            size: 11
          },
          maxRotation: 0
        },
        border: {
          display: false
        }
      },
      y: {
        position: 'right' as const,
        grid: {
          color: 'rgba(255, 255, 255, 0.05)',
          drawBorder: false
        },
        ticks: {
          color: 'rgba(255, 255, 255, 0.5)',
          font: {
            size: 11
          },
          padding: 8,
          callback: function(value: any) {
            return '$' + value.toFixed(2);
          }
        },
        border: {
          display: false
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
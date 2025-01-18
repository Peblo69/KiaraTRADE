import React, { useState, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Chart } from 'react-chartjs-2';
import { Card } from '@/components/ui/card';
import 'chartjs-adapter-date-fns';
import 'chartjs-chart-financial';

// Register all required components
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
          const volatility = 10;
          const trend = Math.sin(i * 0.1) * 20;
          const noise = (Math.random() - 0.5) * volatility;
          const price = basePrice + trend + noise;

          // Create more realistic candle data
          const open = price;
          const close = price + (Math.random() - 0.5) * volatility;
          const high = Math.max(open, close) + Math.random() * volatility;
          const low = Math.min(open, close) - Math.random() * volatility;

          return {
            timestamp: Date.now() - (100 - i) * 300000, // 5-minute candles
            open,
            high,
            low,
            close,
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

  const chartOptions = {
    type: 'candlestick',
    data: {
      datasets: [{
        label: 'OHLC',
        data: chartData.map(candle => ({
          x: candle.timestamp,
          o: candle.open,
          h: candle.high,
          l: candle.low,
          c: candle.close
        })),
        backgroundColor: (ctx: any) => {
          if (!ctx.parsed) return 'rgba(0,0,0,0)';
          return ctx.parsed.c >= ctx.parsed.o ? 
            'rgba(38, 166, 154, 0.4)' : 
            'rgba(239, 83, 80, 0.4)';
        },
        borderColor: (ctx: any) => {
          if (!ctx.parsed) return 'rgba(0,0,0,0)';
          return ctx.parsed.c >= ctx.parsed.o ? 
            'rgb(38, 166, 154)' : 
            'rgb(239, 83, 80)';
        }
      }, {
        type: 'bar',
        label: 'Volume',
        data: chartData.map(candle => ({
          x: candle.timestamp,
          y: candle.volume
        })),
        backgroundColor: (ctx: any) => {
          if (!ctx.parsed?.y) return 'rgba(0,0,0,0)';
          const index = ctx.dataIndex;
          const candle = chartData[index];
          return candle.close >= candle.open ? 
            'rgba(38, 166, 154, 0.2)' : 
            'rgba(239, 83, 80, 0.2)';
        },
        yAxisID: 'volume'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
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
              const index = context.dataIndex;
              const candle = chartData[index];
              return [
                `Open: $${candle.open.toFixed(6)}`,
                `High: $${candle.high.toFixed(6)}`,
                `Low: $${candle.low.toFixed(6)}`,
                `Close: $${candle.close.toFixed(6)}`,
                `Volume: ${candle.volume.toLocaleString()}`
              ];
            }
          }
        }
      },
      scales: {
        x: {
          type: 'category',
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
            color: 'rgba(255, 255, 255, 0.05)'
          },
          ticks: {
            color: 'rgba(255, 255, 255, 0.5)',
            font: {
              size: 11
            },
            callback: function(value: any) {
              return '$' + value.toFixed(6);
            }
          },
          border: {
            display: false
          }
        },
        volume: {
          position: 'left' as const,
          grid: {
            display: false
          },
          ticks: {
            color: 'rgba(255, 255, 255, 0.5)',
            font: {
              size: 11
            }
          },
          border: {
            display: false
          }
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
        <Chart {...chartOptions} />
      </div>
    </Card>
  );
};

export default TokenChart;
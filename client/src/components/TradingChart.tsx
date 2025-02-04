
import React, { useEffect, useRef } from 'react';
import { Chart } from 'chart.js/auto';
import { usePumpPortalStore } from '@/lib/pump-portal-websocket';

interface TradingChartProps {
  tokenAddress?: string;
}

const TradingChart: React.FC<TradingChartProps> = ({ tokenAddress }) => {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<Chart | null>(null);
  
  // Get token data from store based on tokenAddress
  const token = usePumpPortalStore(state => 
    tokenAddress ? state.getToken(tokenAddress) : null
  );

  useEffect(() => {
    if (!chartRef.current || !token || !tokenAddress) return;

    const ctx = chartRef.current.getContext('2d');
    if (!ctx) return;

    // Cleanup previous chart instance
    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    // Process trade data for the specific token
    const trades = token.recentTrades || [];
    const labels = trades.map(trade => new Date(trade.timestamp).toLocaleTimeString());
    const prices = trades.map(trade => trade.priceInUsd);

    // Create new chart instance
    chartInstance.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: `${token.symbol} Price (USD)`,
          data: prices,
          borderColor: '#8b5cf6',
          backgroundColor: 'rgba(139, 92, 246, 0.1)',
          fill: true,
          tension: 0.4,
        }]
      },
      options: {
        animation: {
          duration: 0
        },
        scales: {
          y: {
            beginAtZero: false,
            grid: {
              color: 'rgba(255, 255, 255, 0.1)'
            },
            ticks: {
              color: '#a1a1aa'
            }
          },
          x: {
            grid: {
              color: 'rgba(255, 255, 255, 0.1)'
            },
            ticks: {
              color: '#a1a1aa',
              maxRotation: 45,
              minRotation: 45
            }
          }
        },
        plugins: {
          legend: {
            display: false
          }
        }
      }
    });

    // Cleanup on unmount
    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [token, tokenAddress]); // Re-run when token or tokenAddress changes

  return (
    <div className="relative bg-[#0D0B1F] rounded-lg p-4 border border-purple-900/30">
      <div className="h-[300px]">
        <canvas ref={chartRef} />
      </div>
    </div>
  );
};

export default TradingChart;

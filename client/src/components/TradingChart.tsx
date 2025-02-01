import React, { useRef, useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LineChart, Settings, Maximize2 } from 'lucide-react';
import { usePumpPortalStore } from '@/lib/pump-portal-websocket';
import { createChart } from 'lightweight-charts';
import type { IChartApi } from 'lightweight-charts';

interface Props {
  tokenAddress: string;
}

const INTERVALS = [
  { label: '1s', value: '1s' },
  { label: '5s', value: '5s' },
  { label: '30s', value: '30s' },
  { label: '1m', value: '1m' },
  { label: '5m', value: '5m' },
  { label: '15m', value: '15m' },
  { label: '1h', value: '1h' },
];

function getTimeframeMs(timeframe: string): number {
  const value = parseInt(timeframe.slice(0, -1));
  const unit = timeframe.slice(-1);

  switch (unit) {
    case 's': return value * 1000;
    case 'm': return value * 60 * 1000;
    case 'h': return value * 60 * 60 * 1000;
    default: return 1000;
  }
}

const TradingChart: React.FC<Props> = ({ tokenAddress }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const [selectedTimeframe, setSelectedTimeframe] = useState('1s');

  const token = usePumpPortalStore(state => state.getToken(tokenAddress));

  useEffect(() => {
    if (!chartContainerRef.current || !token?.recentTrades?.length) return;

    // Create chart
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { color: '#0D0B1F' },
        textColor: '#d1d4dc',
      },
      grid: {
        vertLines: { color: 'rgba(42, 46, 57, 0.2)' },
        horzLines: { color: 'rgba(42, 46, 57, 0.2)' },
      },
      width: chartContainerRef.current.clientWidth,
      height: 400,
      timeScale: {
        timeVisible: true,
        secondsVisible: true,
      },
    });

    // Create candlestick series
    const candlestickSeries = chart.addCandlestickSeries({
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderVisible: false,
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350',
    });

    // Group trades by timeframe
    const timeframeMs = getTimeframeMs(selectedTimeframe);
    const groupedTrades: Record<number, any[]> = {};

    token.recentTrades.forEach(trade => {
      const timestamp = Math.floor(trade.timestamp / timeframeMs) * timeframeMs;
      if (!groupedTrades[timestamp]) {
        groupedTrades[timestamp] = [];
      }
      groupedTrades[timestamp].push(trade);
    });

    // Convert to candlestick data
    const candleData = Object.entries(groupedTrades).map(([time, trades]) => {
      const prices = trades.map(t => t.priceInUsd);
      return {
        time: parseInt(time) / 1000,
        open: prices[0],
        high: Math.max(...prices),
        low: Math.min(...prices),
        close: prices[prices.length - 1],
      };
    }).sort((a, b) => a.time - b.time);

    // Set chart data
    candlestickSeries.setData(candleData);
    chart.timeScale().fitContent();

    chartRef.current = chart;

    // Cleanup
    return () => {
      chart.remove();
      chartRef.current = null;
    };
  }, [token?.recentTrades, selectedTimeframe]);

  if (!token) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-200">Price Chart</h2>
          <p className="text-sm text-gray-400">Real-time market data</p>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex gap-2 bg-[#1A1A1A] p-2 rounded-lg border border-purple-500/10">
            {INTERVALS.map((interval) => (
              <button
                key={interval.value}
                onClick={() => setSelectedTimeframe(interval.value)}
                className={`
                  px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200
                  ${selectedTimeframe === interval.value 
                    ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/20' 
                    : 'text-gray-400 hover:bg-purple-500/20'
                  }
                `}
              >
                {interval.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="hover:bg-purple-500/20">
              <Settings className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="outline" className="hover:bg-purple-500/20">
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div ref={chartContainerRef} className="w-full rounded-lg overflow-hidden" />
    </div>
  );
};

export default TradingChart;
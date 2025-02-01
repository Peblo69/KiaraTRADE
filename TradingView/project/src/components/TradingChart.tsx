import React, { useEffect, useRef } from 'react';
import { createChart, IChartApi } from 'lightweight-charts';
import { LineChart } from 'lucide-react';
import { usePumpPortalStore } from '../lib/pump-portal-websocket';

const TradingChart: React.FC = () => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<any>(null);

  // Get real-time trade data from PumpPortal WebSocket
  const trades = usePumpPortalStore(state => state.trades);
  const solPrice = usePumpPortalStore(state => state.solPrice);

  useEffect(() => {
    if (!chartContainerRef.current || chartRef.current) return;

    // Create chart instance
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

    // Add candlestick series
    const candleSeries = chart.addCandlestickSeries({
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderUpColor: '#26a69a',
      borderDownColor: '#ef5350',
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350',
    });

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;

    // Handle window resizing
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
      chartRef.current = null;
    };
  }, []);

  // Update chart data when new trades come in
  useEffect(() => {
    if (!candleSeriesRef.current || !trades.length) return;

    // Group trades into candlesticks (1 minute intervals)
    const timeframeMs = 60 * 1000; // 1 minute
    const groupedTrades: Record<number, any[]> = {};

    trades.forEach(trade => {
      const timestamp = Math.floor(trade.timestamp / timeframeMs) * timeframeMs;
      if (!groupedTrades[timestamp]) {
        groupedTrades[timestamp] = [];
      }
      groupedTrades[timestamp].push(trade);
    });

    // Convert grouped trades to candlestick format
    const candleData = Object.entries(groupedTrades).map(([time, periodTrades]) => {
      const prices = periodTrades.map(t => t.priceInUsd || 0);
      return {
        time: parseInt(time) / 1000,
        open: prices[0],
        high: Math.max(...prices),
        low: Math.min(...prices),
        close: prices[prices.length - 1],
      };
    });

    // Sort by time and update chart
    const sortedData = candleData.sort((a, b) => a.time - b.time);
    candleSeriesRef.current.setData(sortedData);

    // Fit content to view
    if (chartRef.current) {
      chartRef.current.timeScale().fitContent();
    }
  }, [trades, solPrice]);

  return (
    <div className="relative bg-[#0D0B1F] rounded-lg p-4 border border-purple-900/30">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <LineChart className="w-5 h-5 text-purple-400" />
          <h2 className="text-purple-100 font-semibold">Price Chart</h2>
        </div>
      </div>
      <div ref={chartContainerRef} className="h-[400px]" />
    </div>
  );
};

export default TradingChart;
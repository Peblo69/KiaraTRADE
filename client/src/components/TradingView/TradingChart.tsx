import React, { useEffect, useRef, useState } from 'react';
import { createChart, IChartApi, ColorType, ISeriesApi, CandlestickSeriesPartialOptions } from 'lightweight-charts';
import { usePumpPortalStore } from '@/lib/pump-portal-websocket';
import { generateCandlestickData, CandlestickData } from '@/utils/generateCandlestickData';

interface Props {
  tokenAddress: string;
  data?: CandlestickData[];
  timeframe?: '1m' | '5m' | '1h';
}

const TradingChart: React.FC<Props> = ({ tokenAddress, data, timeframe = "1m" }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const [lastUpdate, setLastUpdate] = useState<number>(Date.now());

  const token = usePumpPortalStore(state => state.getToken(tokenAddress));
  const solPrice = usePumpPortalStore(state => state.solPrice);

  // Create chart once
  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#0D0B1F' },
        textColor: '#d1d4dc',
      },
      grid: {
        vertLines: { color: 'rgba(42, 46, 57, 0.2)' },
        horzLines: { color: 'rgba(42, 46, 57, 0.2)' },
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: true,
        borderColor: 'rgba(197, 203, 206, 0.3)',
      },
      width: containerRef.current.clientWidth,
      height: 500,
      crosshair: {
        mode: 1,
        vertLine: {
          color: '#6B7280',
          labelBackgroundColor: '#1F2937',
        },
        horzLine: {
          color: '#6B7280',
          labelBackgroundColor: '#1F2937',
        },
      }
    });

    const candleStickOptions: CandlestickSeriesPartialOptions = {
      upColor: '#22C55E',
      downColor: '#EF4444',
      borderVisible: false,
      wickUpColor: '#22C55E',
      wickDownColor: '#EF4444',
    };

    const candleSeries = chart.addCandlestickSeries(candleStickOptions);
    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;

    return () => {
      chart.remove();
    };
  }, []);

  // Update data and handle real-time updates
  useEffect(() => {
    if (!candleSeriesRef.current) return;

    const updateChart = () => {
      try {
        // Use provided data if available
        if (data && data.length > 0) {
          candleSeriesRef.current!.setData(data);
          chartRef.current?.timeScale().fitContent();
          return;
        }

        // Generate candlestick data from token trades
        if (!token) return;

        const interval = timeframe === "1m" ? 60 : timeframe === "5m" ? 300 : 3600;
        const candleData = generateCandlestickData(
          token.recentTrades || [], 
          interval,
          token.priceInUsd
        );

        if (candleData.length > 0) {
          candleSeriesRef.current!.setData(candleData);
          chartRef.current?.timeScale().fitContent();
        }
      } catch (error) {
        console.error('Error updating chart:', error);
      }

      setLastUpdate(Date.now());
    };

    // Initial update
    updateChart();

    // Set up real-time updates
    const intervalId = setInterval(updateChart, 1000);
    return () => clearInterval(intervalId);
  }, [token?.recentTrades, token?.priceInUsd, data, timeframe, tokenAddress]);

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current && chartRef.current) {
        chartRef.current.applyOptions({ 
          width: containerRef.current.clientWidth 
        });
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!token) {
    return (
      <div className="w-full h-[500px] flex items-center justify-center bg-[#0D0B1F] text-gray-400">
        Loading token data...
      </div>
    );
  }

  const formattedMcap = token.marketCapSol && solPrice 
    ? (token.marketCapSol * solPrice).toLocaleString(undefined, {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })
    : '$0.00';

  return (
    <div className="w-full h-full bg-[#0D0B1F] rounded-lg overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-purple-900/30">
        <h2 className="text-purple-100 font-semibold">Price Chart</h2>
        <div className="text-sm text-purple-200 space-x-4">
          <span>Price: ${token.priceInUsd?.toFixed(8) || '0.00000000'}</span>
          <span>MCap: {formattedMcap}</span>
          <span className="text-xs text-purple-400">
            Last update: {new Date(lastUpdate).toLocaleTimeString()}
          </span>
        </div>
      </div>
      <div ref={containerRef} className="w-full h-[500px]" />
    </div>
  );
};

export default TradingChart;
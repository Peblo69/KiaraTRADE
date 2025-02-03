import React, { useEffect, useRef } from 'react';
import { createChart, IChartApi, ColorType } from 'lightweight-charts';
import { usePumpPortalStore } from '@/lib/pump-portal-websocket';
import { generateCandlestickData } from '@/utils/generateCandlestickData';

interface Props {
  tokenAddress: string;
  timeframe?: string;
}

const TradingChart: React.FC<Props> = ({ tokenAddress, timeframe = "1m" }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<any>(null);

  const token = usePumpPortalStore(state => state.getToken(tokenAddress));
  const solPrice = usePumpPortalStore(state => state.solPrice);

  // Debug logs
  useEffect(() => {
    console.log('TradingChart Mount:', {
      tokenAddress,
      hasToken: !!token,
      tradesCount: token?.recentTrades?.length || 0,
      solPrice,
      currentPrice: token?.priceInUsd
    });
  }, [tokenAddress, token, solPrice]);

  // Create chart once
  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#161b2b' },
        textColor: '#d1d4dc',
      },
      grid: {
        vertLines: { color: 'rgba(42, 46, 57, 0.2)' },
        horzLines: { color: 'rgba(42, 46, 57, 0.2)' },
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: true,
      },
      width: containerRef.current.clientWidth,
      height: 500,
      crosshair: {
        mode: 1
      }
    });

    const candleSeries = chart.addCandlestickSeries({
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderVisible: true,
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350'
    });

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;

    return () => {
      chart.remove();
    };
  }, []);

  // Update data when trades change
  useEffect(() => {
    if (!candleSeriesRef.current || !token?.recentTrades?.length) return;

    const updateChart = () => {
      const trades = [...token.recentTrades].sort((a, b) => a.timestamp - b.timestamp);
      const candleData = generateCandlestickData(trades);
      console.log("Generated Candle Data:", candleData);

      if (candleData.length > 0) {
        candleSeriesRef.current.setData(candleData);
        // Add latest price as a marker
        const lastPrice = trades[trades.length - 1].priceInUsd;
        candleSeriesRef.current.setMarkers([
          {
            time: trades[trades.length - 1].timestamp,
            position: 'inBar',
            color: 'red',
            shape: 'circle',
            text: `$${lastPrice.toFixed(8)}`
          }
        ]);
        chartRef.current?.timeScale().fitContent();
      }
    };

    // Initial update
    updateChart();
    
    // Real-time updates
    const interval = setInterval(updateChart, 1000);
    return () => clearInterval(interval);
  }, [token?.recentTrades, tokenAddress]);

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
      <div className="w-full h-[500px] flex items-center justify-center bg-[#161b2b] text-gray-400">
        Loading token data...
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-[#161b2b] rounded-lg overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-purple-900/30">
        <h2 className="text-purple-100 font-semibold">Price Chart</h2>
        <div className="text-sm text-purple-200">
          Price: ${token.priceInUsd?.toFixed(8) || '0.00000000'} | 
          MCap: ${(token.marketCapSol * solPrice)?.toLocaleString(undefined, {maximumFractionDigits: 2})}
        </div>
      </div>
      <div ref={containerRef} className="w-full h-[500px]" />
    </div>
  );
};

export default TradingChart;

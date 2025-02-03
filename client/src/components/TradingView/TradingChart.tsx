import React, { useEffect, useRef, useState } from 'react';
import { createChart, IChartApi, ColorType } from 'lightweight-charts';
import { usePumpPortalStore } from '@/lib/pump-portal-websocket';
import { generateCandlestickData, CandlestickData } from '@/utils/generateCandlestickData';
import { useTradingContext } from '@/context/TradingContext';

interface Props {
  tokenAddress: string;
  timeframe?: string;
}

const TradingChart: React.FC<Props> = ({ tokenAddress, timeframe = "1m" }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<any>(null);
  const [lastUpdate, setLastUpdate] = useState<number>(Date.now());

  const token = usePumpPortalStore(state => state.getToken(tokenAddress));
  const { lastSolPrice, priceError } = useTradingContext();

  // Debug logs
  useEffect(() => {
    console.log('TradingChart Mount:', {
      tokenAddress,
      hasToken: !!token,
      tradesCount: token?.recentTrades?.length || 0,
      lastSolPrice,
      currentPrice: token?.priceInUsd,
      priceError
    });
  }, [tokenAddress, token, lastSolPrice, priceError]);

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

  // Update data when trades change or every second for live updates
  useEffect(() => {
    if (!candleSeriesRef.current) {
      console.log('No candle series available');
      return;
    }

    if (!token?.recentTrades?.length) {
      console.log('No trades available for token:', tokenAddress);
      return;
    }

    const updateChart = () => {
      const candleData = generateCandlestickData(token.recentTrades);
      console.log('Generated candleData:', candleData);

      // Add current price as the latest candle
      const currentTime = Math.floor(Date.now() / 1000);
      const currentPrice = token.priceInUsd || 0;

      // Only add current price if it's not zero and we have a valid SOL price
      if (currentPrice > 0 && lastSolPrice) {
        const latestCandle: CandlestickData = {
          time: currentTime,
          open: currentPrice,
          high: currentPrice,
          low: currentPrice,
          close: currentPrice,
          volume: 0, // Volume for current incomplete candle
        };

        const updatedData = [...candleData];

        // Update or add the latest candle
        if (updatedData.length > 0 && updatedData[updatedData.length - 1].time === currentTime) {
          const lastCandle = updatedData[updatedData.length - 1];
          updatedData[updatedData.length - 1] = {
            ...lastCandle,
            close: currentPrice,
            high: Math.max(lastCandle.high, currentPrice),
            low: Math.min(lastCandle.low, currentPrice),
            volume: lastCandle.volume // Preserve existing volume
          };
        } else {
          updatedData.push(latestCandle);
        }

        console.log('Setting chart data:', updatedData);
        candleSeriesRef.current.setData(updatedData);
        chartRef.current?.timeScale().fitContent();
      }

      setLastUpdate(Date.now());
    };

    // Initial update
    updateChart();

    // Set up interval for live updates
    const interval = setInterval(updateChart, 1000);
    return () => clearInterval(interval);
  }, [token?.recentTrades, token?.priceInUsd, tokenAddress, lastSolPrice]);

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

  if (priceError) {
    return (
      <div className="w-full h-[500px] flex items-center justify-center bg-[#161b2b] text-red-400">
        {priceError}
      </div>
    );
  }

  const formattedMcap = token.marketCapSol && lastSolPrice 
    ? (token.marketCapSol * lastSolPrice).toLocaleString(undefined, {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })
    : '$0.00';

  return (
    <div className="w-full h-full bg-[#161b2b] rounded-lg overflow-hidden">
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
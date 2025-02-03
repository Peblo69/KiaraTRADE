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
  const volumeSeriesRef = useRef<any>(null);

  // Retrieve token data and SOL price from the store
  const token = usePumpPortalStore(state => state.getToken(tokenAddress));
  const solPrice = usePumpPortalStore(state => state.solPrice);

  // INITIALIZE CHART ON MOUNT
  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#161b2b' },
        textColor: '#d1d4dc',
        fontSize: 12,
      },
      grid: {
        vertLines: { color: 'rgba(42, 46, 57, 0.5)' },
        horzLines: { color: 'rgba(42, 46, 57, 0.5)' },
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
          width: 1,
          color: 'rgba(224, 227, 235, 0.1)',
          style: 0,
        },
        horzLine: {
          width: 1,
          color: 'rgba(224, 227, 235, 0.1)',
          style: 0,
        },
      },
      rightPriceScale: {
        borderColor: 'rgba(197, 203, 206, 0.3)',
        borderVisible: true,
        scaleMargins: { top: 0.1, bottom: 0.2 },
      },
    });
    chartRef.current = chart;

    // Create and store the candlestick series
    const candleSeries = chart.addCandlestickSeries({
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderVisible: true,
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350',
    });
    candleSeriesRef.current = candleSeries;

    // Create and store the volume series
    const volumeSeries = chart.addHistogramSeries({
      color: '#26a69a',
      priceFormat: { type: 'volume' },
      priceScaleId: '',
      scaleMargins: { top: 0.8, bottom: 0 },
    });
    volumeSeriesRef.current = volumeSeries;

    // Set initial data from token trades if available, otherwise use a fallback candle.
    if (token && token.recentTrades && token.recentTrades.length > 0) {
      const trades = [...token.recentTrades].sort((a, b) => a.timestamp - b.timestamp);
      const candleData = generateCandlestickData(trades, 60, token.priceInUsd || 0);
      candleSeries.setData(candleData);

      const volumeData = candleData.map(candle => ({
        time: candle.time,
        value: candle.volume,
        color: candle.close >= candle.open ? '#26a69a50' : '#ef535050',
      }));
      volumeSeries.setData(volumeData);
    } else {
      const fallbackPrice = token ? token.priceInUsd || 0 : 0;
      const fallbackTime = Math.floor(Date.now() / 1000);
      const fallbackCandle = {
        time: fallbackTime,
        open: fallbackPrice,
        high: fallbackPrice,
        low: fallbackPrice,
        close: fallbackPrice,
        volume: 0,
      };
      candleSeries.setData([fallbackCandle]);
      volumeSeries.setData([{ time: fallbackTime, value: 0, color: '#26a69a50' }]);
    }

    return () => {
      chart.remove();
    };
  }, []); // Run once on mount

  // Update chart data when token trade data or price changes
  useEffect(() => {
    if (!candleSeriesRef.current || !volumeSeriesRef.current || !token) return;
    if (token.recentTrades && token.recentTrades.length > 0) {
      const trades = [...token.recentTrades].sort((a, b) => a.timestamp - b.timestamp);
      const candleData = generateCandlestickData(trades, 60, token.priceInUsd || 0);
      if (candleData.length > 0) {
        candleSeriesRef.current.setData(candleData);
        const volumeData = candleData.map(candle => ({
          time: candle.time,
          value: candle.volume,
          color: candle.close >= candle.open ? '#26a69a50' : '#ef535050',
        }));
        volumeSeriesRef.current.setData(volumeData);
        chartRef.current?.timeScale().fitContent();
      }
    }
  }, [token?.recentTrades, token?.priceInUsd]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: containerRef.current.clientWidth,
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
          MCap: {(token.marketCapSol * solPrice)?.toLocaleString(undefined, { maximumFractionDigits: 2 })}
        </div>
      </div>
      <div ref={containerRef} className="w-full h-[500px]" />
    </div>
  );
};

export default TradingChart;

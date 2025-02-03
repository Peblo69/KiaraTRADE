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
  const lastPriceLineRef = useRef<any>(null);

  const token = usePumpPortalStore(state => state.getToken(tokenAddress));
  const solPrice = usePumpPortalStore(state => state.solPrice);

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

    // Add price line
    const priceLine = candleSeries.createPriceLine({
      price: 0,
      color: '#2962FF',
      lineWidth: 2,
      lineStyle: 2,
      axisLabelVisible: true,
      title: 'Current Price',
    });

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;
    lastPriceLineRef.current = priceLine;

    return () => {
      chart.remove();
    };
  }, []);

  // Update data when trades change or price updates
  useEffect(() => {
    if (!candleSeriesRef.current || !token) return;

    const updateChart = () => {
      // Update candlestick data if trades exist
      if (token.recentTrades?.length) {
        const candleData = generateCandlestickData(token.recentTrades);
        console.log("Generated Candle Data:", candleData);

        if (candleData.length > 0) {
          candleSeriesRef.current.setData(candleData);
        }
      }

      // Update current price line
      if (token.priceInUsd && lastPriceLineRef.current) {
        lastPriceLineRef.current.applyOptions({
          price: token.priceInUsd,
          title: `Current: $${token.priceInUsd.toFixed(8)}`,
        });
      }

      chartRef.current?.timeScale().fitContent();
    };

    // Initial update
    updateChart();

    // Set up interval for real-time updates
    const interval = setInterval(updateChart, 1000);
    return () => clearInterval(interval);
  }, [token, token?.recentTrades, token?.priceInUsd, tokenAddress]);

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

  const marketCap = token.marketCapSol * solPrice;

  return (
    <div className="w-full h-full bg-[#161b2b] rounded-lg overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-purple-900/30">
        <h2 className="text-purple-100 font-semibold">Price Chart</h2>
        <div className="flex items-center gap-4">
          <div className="text-sm text-purple-200">
            Price: ${token.priceInUsd?.toFixed(8) || '0.00000000'}
          </div>
          <div className="text-sm text-purple-200">
            MCap: ${marketCap?.toLocaleString(undefined, {maximumFractionDigits: 2})}
          </div>
        </div>
      </div>
      <div ref={containerRef} className="w-full h-[500px]" />
    </div>
  );
};

export default TradingChart;
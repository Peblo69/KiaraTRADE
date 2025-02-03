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
  const token = usePumpPortalStore(state => state.getToken(tokenAddress));

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
        secondsVisible: false,
      },
      width: containerRef.current.clientWidth,
      height: 500
    });

    const candleSeries = chart.addCandlestickSeries();
    const volumeSeries = chart.addHistogramSeries({
      color: '#385263',
      priceFormat: { type: 'volume' },
      priceScaleId: '',
    });

    chartRef.current = chart;

    // Update data when trades change
    if (token?.recentTrades) {
      const candleData = generateCandlestickData(token.recentTrades);
      candleSeries.setData(candleData);
      volumeSeries.setData(candleData);
      chart.timeScale().fitContent();
    }

    const handleResize = () => {
      if (containerRef.current) {
        chart.applyOptions({ width: containerRef.current.clientWidth });
      }
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [token?.recentTrades, tokenAddress]);

  return (
    <div className="w-full h-full bg-[#161b2b] rounded-lg overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-purple-900/30">
        <h2 className="text-purple-100 font-semibold">Real-Time Chart</h2>
        <div className="text-sm text-purple-200">
          Price: ${token?.priceInUsd?.toFixed(8) || '0.00000000'}
        </div>
      </div>
      <div ref={containerRef} className="w-full h-[500px]" />
    </div>
  );
};

export default TradingChart;
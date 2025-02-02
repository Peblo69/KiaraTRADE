import React, { useEffect, useRef, useState } from 'react';
import { LineChart } from 'lucide-react';
import { createChart } from 'lightweight-charts';
import { usePumpPortalStore } from "@/lib/pump-portal-websocket";

interface Props {
  tokenAddress: string;
}

const MarketCapChart: React.FC<Props> = ({ tokenAddress }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);
  const candleSeriesRef = useRef<any>(null);
  const volumeSeriesRef = useRef<any>(null);

  // Get EXACTLY the same data as your other components
  const token = usePumpPortalStore(state => state.getToken(tokenAddress));
  const solPrice = usePumpPortalStore(state => state.solPrice);
  const trades = token?.recentTrades || [];

  useEffect(() => {
    if (!containerRef.current || !token) return;

    // Clear any existing chart
    if (chartRef.current) {
      containerRef.current.innerHTML = '';
    }

    const chart = createChart(containerRef.current, {
      layout: {
        background: { color: '#0D0B1F' },
        textColor: '#d1d4dc',
      },
      grid: {
        vertLines: { color: 'rgba(42, 46, 57, 0.2)' },
        horzLines: { color: 'rgba(42, 46, 57, 0.2)' },
      },
      width: containerRef.current.clientWidth,
      height: 500,
      timeScale: {
        timeVisible: true,
        secondsVisible: true,
      },
    });

    const candleSeries = chart.addCandlestickSeries({
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderUpColor: '#26a69a',
      borderDownColor: '#ef5350',
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350',
    });

    // Add volume series
    const volumeSeries = chart.addHistogramSeries({
      color: '#385263',
      priceFormat: {
        type: 'volume',
      },
      priceScaleId: '', 
      scaleMargins: {
        top: 0.8,
        bottom: 0,
      },
    });

    // Process trades using YOUR price calculation logic
    if (trades.length > 0 && token) {
      const ohlcData = new Map();
      const minuteInMs = 60000;

      trades.forEach(trade => {
        // Use YOUR price calculation logic from the store
        const price = trade.priceInUsd;
        const timestamp = Math.floor(trade.timestamp / minuteInMs) * minuteInMs;

        if (!ohlcData.has(timestamp)) {
          ohlcData.set(timestamp, {
            time: timestamp / 1000,
            open: price,
            high: price,
            low: price,
            close: price,
            volume: trade.tokenAmount
          });
        } else {
          const candle = ohlcData.get(timestamp);
          candle.high = Math.max(candle.high, price);
          candle.low = Math.min(candle.low, price);
          candle.close = price;
          candle.volume += trade.tokenAmount;
        }
      });

      const candleData = Array.from(ohlcData.values())
        .sort((a, b) => a.time - b.time);

      candleSeries.setData(candleData);
      volumeSeries.setData(candleData);

      // Set up real-time updates
      const lastCandle = candleData[candleData.length - 1];
      if (lastCandle) {
        candleSeries.update(lastCandle);
        volumeSeries.update(lastCandle);
      }
    }

    // Handle resizing
    const handleResize = () => {
      if (containerRef.current) {
        chart.applyOptions({
          width: containerRef.current.clientWidth
        });
      }
    };

    window.addEventListener('resize', handleResize);
    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;
    volumeSeriesRef.current = volumeSeries;

    return () => {
      window.removeEventListener('resize', handleResize);
      if (chart) {
        chart.remove();
      }
    };
  }, [token, trades, solPrice]);

  return (
    <div className="relative bg-[#0D0B1F] rounded-lg p-4 border border-purple-900/30">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <LineChart className="w-5 h-5 text-purple-400" />
          <h2 className="text-purple-100 font-semibold">
            {token?.symbol || tokenAddress.slice(0, 6)}... Price Chart
          </h2>
        </div>
        {token && (
          <div className="text-sm text-purple-300">
            Current Price: ${token.priceInUsd?.toFixed(8) || '0.00000000'}
          </div>
        )}
      </div>
      <div ref={containerRef} className="h-[500px] w-full" />
    </div>
  );
};

export default MarketCapChart;
import React, { useEffect, useRef, useState } from 'react';
import { createChart, IChartApi } from 'lightweight-charts';
import { usePumpPortalStore } from "@/lib/pump-portal-websocket";

interface MarketCapChartProps {
  tokenAddress: string;
}

const MarketCapChart: React.FC<MarketCapChartProps> = ({ tokenAddress }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<any>(null);
  const token = usePumpPortalStore(state => state.tokens.find(t => t.address === tokenAddress));
  const [lastUpdate, setLastUpdate] = useState<number>(Date.now());

  // Process trades into candles
  const processTradeData = (trades: any[]) => {
    if (!trades || trades.length === 0) return [];

    const sortedTrades = trades.sort((a, b) => a.timestamp - b.timestamp);
    const candles: any[] = [];
    let currentCandle = {
      time: Math.floor(sortedTrades[0].timestamp / 1000),
      open: sortedTrades[0].priceInUsd || 0,
      high: sortedTrades[0].priceInUsd || 0,
      low: sortedTrades[0].priceInUsd || 0,
      close: sortedTrades[0].priceInUsd || 0,
    };

    sortedTrades.forEach((trade) => {
      const tradeTime = Math.floor(trade.timestamp / 1000);
      const price = trade.priceInUsd || 0;

      if (tradeTime - currentCandle.time > 60) { // New candle every minute
        if (currentCandle.open !== 0) {
          candles.push(currentCandle);
        }
        currentCandle = {
          time: tradeTime,
          open: price,
          high: price,
          low: price,
          close: price,
        };
      } else {
        currentCandle.high = Math.max(currentCandle.high, price);
        currentCandle.low = Math.min(currentCandle.low, price);
        currentCandle.close = price;
      }
    });

    if (currentCandle.open !== 0) {
      candles.push(currentCandle);
    }

    return candles;
  };

  useEffect(() => {
    if (!chartContainerRef.current || !token) return;

    // Initialize chart
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { color: '#0D0B1F' },
        textColor: '#d1d5db',
      },
      width: chartContainerRef.current.clientWidth,
      height: 400,
      rightPriceScale: {
        visible: true,
        borderColor: '#2c2c3d',
        scaleMargins: {
          top: 0.1,
          bottom: 0.1,
        },
        autoScale: true,
      },
      leftPriceScale: {
        visible: false,
      },
      grid: {
        vertLines: {
          color: 'rgba(42, 46, 57, 0.5)',
        },
        horzLines: {
          color: 'rgba(42, 46, 57, 0.5)',
        },
      },
      timeScale: {
        borderColor: '#2c2c3d',
        timeVisible: true,
        secondsVisible: true,
      },
      crosshair: {
        mode: 1,
        vertLine: {
          color: '#6b7280',
          width: 1,
          style: 1,
          visible: true,
          labelVisible: true,
        },
        horzLine: {
          color: '#6b7280',
          width: 1,
          style: 1,
          visible: true,
          labelVisible: true,
        },
      },
    });

    // Add market cap series
    const marketCapSeries = chart.addCandlestickSeries({
      upColor: '#4caf50',
      downColor: '#ef5350',
      borderVisible: false,
      wickUpColor: '#4caf50',
      wickDownColor: '#ef5350',
    });

    seriesRef.current = marketCapSeries;
    chartRef.current = chart;

    // Process and set initial data
    if (token.recentTrades && token.recentTrades.length > 0) {
      const candles = processTradeData(token.recentTrades);
      if (candles.length > 0) {
        marketCapSeries.setData(candles);
        chart.timeScale().fitContent();
      }
    }

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current && chart) {
        chart.applyOptions({ 
          width: chartContainerRef.current.clientWidth 
        });
      }
    };

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [tokenAddress]); // Only recreate chart when token address changes

  // Update data when trades change
  useEffect(() => {
    if (!token || !seriesRef.current) return;

    const candles = processTradeData(token.recentTrades);
    if (candles.length > 0) {
      seriesRef.current.setData(candles);
      chartRef.current?.timeScale().fitContent();
      setLastUpdate(Date.now());
    }
  }, [token?.recentTrades]);

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-purple-100">Market Cap Chart</h2>
        {token && (
          <div className="text-sm text-purple-300">
            Current Price: ${token.priceInUsd?.toFixed(8) || '0.00000000'}
          </div>
        )}
      </div>
      <div ref={chartContainerRef} className="w-full h-[400px]" />
    </div>
  );
};

export default MarketCapChart;
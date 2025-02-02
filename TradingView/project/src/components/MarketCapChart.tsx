import React, { useEffect, useRef } from 'react';
import { createChart, IChartApi } from 'lightweight-charts';
import { usePumpPortalStore } from "@/lib/pump-portal-websocket";

interface MarketCapChartProps {
  tokenAddress: string;
}

const MarketCapChart: React.FC<MarketCapChartProps> = ({ tokenAddress }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const token = usePumpPortalStore(state => state.tokens.find(t => t.address === tokenAddress));

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
        secondsVisible: false,
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

    // Process token trades into candles
    if (token.recentTrades && token.recentTrades.length > 0) {
      const trades = token.recentTrades.sort((a, b) => a.timestamp - b.timestamp);
      const candles = [];
      let currentCandle = {
        time: Math.floor(trades[0].timestamp / 1000),
        open: trades[0].priceInUsd,
        high: trades[0].priceInUsd,
        low: trades[0].priceInUsd,
        close: trades[0].priceInUsd,
      };

      trades.forEach((trade) => {
        const tradeTime = Math.floor(trade.timestamp / 1000);
        if (tradeTime - currentCandle.time > 60) { // New candle every minute
          candles.push(currentCandle);
          currentCandle = {
            time: tradeTime,
            open: trade.priceInUsd,
            high: trade.priceInUsd,
            low: trade.priceInUsd,
            close: trade.priceInUsd,
          };
        } else {
          currentCandle.high = Math.max(currentCandle.high, trade.priceInUsd);
          currentCandle.low = Math.min(currentCandle.low, trade.priceInUsd);
          currentCandle.close = trade.priceInUsd;
        }
      });
      candles.push(currentCandle);

      marketCapSeries.setData(candles);
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

    // Store chart reference
    chartRef.current = chart;

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [token, tokenAddress]); // Re-run when token or address changes

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
import React, { useEffect, useRef } from 'react';
import { LineChart } from 'lucide-react';
import { usePumpPortalStore } from '@/lib/pump-portal-websocket';
import { wsManager } from '@/lib/websocket-manager';

interface Props {
  tokenAddress: string;
  data: {
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }[];
  onTimeframeChange?: (timeframe: string) => void;
  timeframe?: string;
}

declare global {
  interface Window {
    LightweightCharts: any;
  }
}

export const TradingChart: React.FC<Props> = ({
  tokenAddress,
  data = [],
  onTimeframeChange,
  timeframe = '1m'
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  // Get data from store
  const token = usePumpPortalStore(state => state.getToken(tokenAddress));
  const trades = token?.recentTrades || [];

  useEffect(() => {
    console.log('[Chart] Setup for token:', tokenAddress, {
      tradesCount: trades.length,
      wsStatus: wsManager.getStatus(),
      dataLength: data.length
    });

    const script = document.createElement('script');
    script.src = 'https://unpkg.com/lightweight-charts/dist/lightweight-charts.standalone.production.js';
    script.async = true;

    script.onload = () => {
      // Return early if container is not available
      if (!containerRef.current) {
        return;
      }

      // Return early if LightweightCharts is not available
      if (typeof window.LightweightCharts === 'undefined') {
        return;
      }

      // Cleanup old chart properly
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }

      const chart = window.LightweightCharts.createChart(containerRef.current, {
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
          borderColor: '#485c7b',
        },
        rightPriceScale: {
          borderColor: '#485c7b',
        },
        crosshair: {
          mode: 1,
          vertLine: {
            color: '#758696',
            width: 1,
            labelBackgroundColor: '#0D0B1F',
          },
          horzLine: {
            color: '#758696',
            width: 1,
            labelBackgroundColor: '#0D0B1F',
          },
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

      // Use provided data first
      if (data.length > 0) {
        console.log('[Chart] Using provided data:', {
          token: tokenAddress,
          candleCount: data.length,
          firstCandle: data[0],
          lastCandle: data[data.length - 1]
        });

        candleSeries.setData(data);
        volumeSeries.setData(data);
      }
      // Fall back to processing trades if no data provided
      else if (trades.length > 0 && token) {
        const ohlcData = new Map();
        const minuteInMs = 60000;

        trades.forEach(trade => {
          const timestamp = Math.floor(trade.timestamp / minuteInMs) * minuteInMs;

          if (!ohlcData.has(timestamp)) {
            ohlcData.set(timestamp, {
              time: timestamp / 1000,
              open: trade.priceInUsd,
              high: trade.priceInUsd,
              low: trade.priceInUsd,
              close: trade.priceInUsd,
              volume: trade.tokenAmount
            });
          } else {
            const candle = ohlcData.get(timestamp);
            candle.high = Math.max(candle.high, trade.priceInUsd);
            candle.low = Math.min(candle.low, trade.priceInUsd);
            candle.close = trade.priceInUsd;
            candle.volume += trade.tokenAmount;
          }
        });

        const candleData = Array.from(ohlcData.values())
          .sort((a, b) => a.time - b.time);

        console.log('[Chart] Processed trades:', {
          token: tokenAddress,
          candleCount: candleData.length,
          firstCandle: candleData[0],
          lastCandle: candleData[candleData.length - 1]
        });

        candleSeries.setData(candleData);
        volumeSeries.setData(candleData);
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

      // Store cleanup function
      cleanupRef.current = () => {
        window.removeEventListener('resize', handleResize);
        if (chart) {
          chart.remove();
        }
        if (containerRef.current) {
          containerRef.current.innerHTML = '';
        }
      };

      chartRef.current = chart;
    };

    document.head.appendChild(script);

    // Cleanup
    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
      if (cleanupRef.current) {
        cleanupRef.current();
      }
    };
  }, [tokenAddress, trades.length, data.length]);

  return (
    <div className="w-full h-full bg-[#161b2b] rounded-lg overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-purple-900/30">
        <div className="flex items-center space-x-2">
          <LineChart className="w-5 h-5 text-purple-400" />
          <h2 className="text-purple-100 font-semibold">
            {token?.symbol || tokenAddress.slice(0, 6)}... Price Chart
          </h2>
        </div>
      </div>
      <div 
        ref={containerRef}
        className="w-full h-[500px]"
      />
    </div>
  );
};

export default TradingChart;

import React, { useEffect, useRef, useState } from 'react';
import { LineChart } from 'lucide-react';
import { usePumpPortalStore } from '@/lib/pump-portal-websocket';

interface Props {
  tokenAddress: string;
}

declare global {
  interface Window {
    TradingView: any;
  }
}

const TradingChart: React.FC<Props> = ({ tokenAddress }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<any>(null);
  const token = usePumpPortalStore(state => state.getToken(tokenAddress));
  const trades = token?.recentTrades || [];
  const solPrice = usePumpPortalStore(state => state.solPrice);

  useEffect(() => {
    console.log('Chart Mount:', {
      tokenAddress,
      tradesCount: trades.length,
      solPrice
    });

    const loadTradingViewScript = async () => {
      if (window.TradingView) return;

      return new Promise((resolve) => {
        const script = document.createElement('script');
        script.src = 'https://s3.tradingview.com/tv.js';
        script.async = true;
        script.onload = resolve;
        document.head.appendChild(script);
      });
    };

    const initializeWidget = () => {
      if (!containerRef.current) return;

      // Clean up previous widget if exists
      if (widgetRef.current) {
        containerRef.current.innerHTML = '';
      }

      try {
        const containerId = `tv_${Math.random().toString(36).substring(7)}`;
        containerRef.current.id = containerId;

        widgetRef.current = new window.TradingView.widget({
          container_id: containerId,
          autosize: true,
          interval: '1',
          timezone: 'Etc/UTC',
          theme: 'dark',
          style: '1',
          locale: 'en',
          toolbar_bg: '#0D0B1F',
          enable_publishing: false,
          allow_symbol_change: false,
          save_image: false,
          height: 500,
          datafeed: {
            onReady: (callback: any) => {
              callback({
                supported_resolutions: ['1', '5', '15', '30', '60'],
                supports_time: true,
                supports_marks: false,
                supports_timescale_marks: false
              });
            },
            getBars: (symbolInfo: any, resolution: string, from: number, to: number, onHistoryCallback: any) => {
              if (!trades.length) {
                onHistoryCallback([], { noData: true });
                return;
              }

              const minuteInMs = 60000;
              const ohlcData = new Map();

              // Convert trades to OHLC data
              trades.forEach(trade => {
                const price = trade.solAmount * solPrice;
                const timestamp = Math.floor(trade.timestamp / minuteInMs) * minuteInMs;

                if (!ohlcData.has(timestamp)) {
                  ohlcData.set(timestamp, {
                    time: timestamp,
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

              onHistoryCallback(candleData, { noData: false });
            },
            subscribeBars: (symbolInfo: any, resolution: string, onRealtimeCallback: any) => {
              const updateChart = () => {
                if (trades[0]) {
                  const latestPrice = trades[0].solAmount * solPrice;
                  onRealtimeCallback({
                    time: trades[0].timestamp,
                    open: latestPrice,
                    high: latestPrice,
                    low: latestPrice,
                    close: latestPrice,
                    volume: trades[0].tokenAmount
                  });
                }
              };

              const interval = setInterval(updateChart, 1000);
              return interval;
            },
            unsubscribeBars: (subscriberUID: string) => {
              clearInterval(subscriberUID as unknown as number);
            }
          },
          overrides: {
            "mainSeriesProperties.candleStyle.upColor": "#26a69a",
            "mainSeriesProperties.candleStyle.downColor": "#ef5350",
            "mainSeriesProperties.candleStyle.wickUpColor": "#26a69a",
            "mainSeriesProperties.candleStyle.wickDownColor": "#ef5350",
            "paneProperties.background": "#0D0B1F",
            "paneProperties.vertGridProperties.color": "rgba(42, 46, 57, 0.2)",
            "paneProperties.horzGridProperties.color": "rgba(42, 46, 57, 0.2)"
          }
        });
      } catch (error) {
        console.error('TradingView widget error:', error);
      }
    };

    loadTradingViewScript().then(initializeWidget);

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
      widgetRef.current = null;
    };
  }, [tokenAddress, token, trades.length, solPrice]);

  return (
    <div className="relative bg-[#0D0B1F] rounded-lg p-4 border border-purple-900/30">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <LineChart className="w-5 h-5 text-purple-400" />
          <h2 className="text-purple-100 font-semibold">
            Live Price Chart
          </h2>
        </div>
      </div>
      <div ref={containerRef} className="h-[500px] w-full" />
    </div>
  );
};

export default TradingChart;
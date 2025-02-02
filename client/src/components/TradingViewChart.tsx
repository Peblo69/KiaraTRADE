import React, { useEffect, useRef, useState } from 'react';
import { LineChart } from 'lucide-react';
import { usePumpPortalStore } from '@/lib/pump-portal-websocket';

declare global {
  interface Window {
    TradingView: any;
  }
}

interface Props {
  tokenAddress: string;
}

const TradingViewChart: React.FC<Props> = ({ tokenAddress }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const trades = usePumpPortalStore(state => state.getToken(tokenAddress)?.recentTrades || []);
  const [chartWidget, setChartWidget] = useState<any>(null);

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/tv.js';
    script.async = true;

    script.onload = () => {
      if (!containerRef.current || !window.TradingView) return;

      // Create a custom symbol name for our new token
      const customSymbol = `SOL:${tokenAddress.slice(0, 8)}`;

      const widget = new window.TradingView.widget({
        container_id: containerRef.current.id,
        symbol: customSymbol, // Use our custom symbol
        interval: '1', // 1 minute candles
        timezone: 'Etc/UTC',
        theme: 'dark',
        style: '1', // Candlestick
        locale: 'en',
        toolbar_bg: '#0D0B1F',
        enable_publishing: false,
        allow_symbol_change: false, // Disable symbol change
        save_image: false,
        height: 500,
        width: '100%',
        studies: ['Volume@tv-basicstudies'],
        loading_screen: { backgroundColor: "#0D0B1F" },
        library_path: '/charting_library/', 
        custom_css_url: '/tradingview-dark.css',
        disabled_features: [
          'header_symbol_search',
          'symbol_search_hot_key',
          'header_compare',
        ],
        enabled_features: [
          'study_templates',
          'create_volume_indicator_by_default',
        ],
        datafeed: {
          onReady: (callback: any) => {
            callback({
              supported_resolutions: ['1', '5', '15', '30', '60'],
              supports_time: true,
              supports_marks: false,
              supports_timescale_marks: false
            });
          },
          resolveSymbol: (symbolName: string, onSymbolResolvedCallback: any) => {
            onSymbolResolvedCallback({
              name: customSymbol,
              description: `${tokenAddress.slice(0, 6)}...${tokenAddress.slice(-4)}`,
              type: 'crypto',
              session: '24x7',
              timezone: 'Etc/UTC',
              minmov: 1,
              pricescale: 1000000, // Adjust based on your price decimals
              has_intraday: true,
              has_no_volume: false,
              has_weekly_and_monthly: false,
              supported_resolutions: ['1', '5', '15', '30', '60'],
              volume_precision: 8,
              data_status: 'streaming'
            });
          },
          getBars: (symbolInfo: any, resolution: string, from: number, to: number, onHistoryCallback: any) => {
            // Convert existing trades to OHLCV
            if (trades.length === 0) {
              onHistoryCallback([], { noData: true });
              return;
            }

            const bars = processTradesIntoCandles(trades, resolution);
            onHistoryCallback(bars, { noData: false });
          },
          subscribeBars: (symbolInfo: any, resolution: string, onRealtimeCallback: any, subscriberUID: any) => {
            // Set up real-time updates
            const intervalId = setInterval(() => {
              if (trades.length > 0) {
                const lastTrade = trades[0];
                onRealtimeCallback({
                  time: lastTrade.timestamp,
                  open: lastTrade.priceInUsd,
                  high: lastTrade.priceInUsd,
                  low: lastTrade.priceInUsd,
                  close: lastTrade.priceInUsd,
                  volume: lastTrade.tokenAmount
                });
              }
            }, 1000);

            return intervalId;
          },
          unsubscribeBars: (subscriberUID: any) => {
            if (subscriberUID) {
              clearInterval(subscriberUID);
            }
          }
        }
      });

      setChartWidget(widget);
    };

    document.head.appendChild(script);
    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, [tokenAddress]); // Recreate when token changes

  // Process trades into OHLCV candles
  const processTradesIntoCandles = (trades: any[], resolution: string) => {
    const interval = parseInt(resolution) * 60 * 1000; // Convert to milliseconds
    const candles = new Map();

    trades.forEach(trade => {
      const timestamp = Math.floor(trade.timestamp / interval) * interval;

      if (!candles.has(timestamp)) {
        candles.set(timestamp, {
          time: timestamp,
          open: trade.priceInUsd,
          high: trade.priceInUsd,
          low: trade.priceInUsd,
          close: trade.priceInUsd,
          volume: trade.tokenAmount
        });
      } else {
        const candle = candles.get(timestamp);
        candle.high = Math.max(candle.high, trade.priceInUsd);
        candle.low = Math.min(candle.low, trade.priceInUsd);
        candle.close = trade.priceInUsd;
        candle.volume += trade.tokenAmount;
      }
    });

    return Array.from(candles.values());
  };

  return (
    <div className="relative bg-[#0D0B1F] rounded-lg p-4 border border-purple-900/30">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <LineChart className="w-5 h-5 text-purple-400" />
          <h2 className="text-purple-100 font-semibold">
            {tokenAddress.slice(0, 6)}...{tokenAddress.slice(-4)} Live Chart
          </h2>
        </div>
      </div>
      <div 
        id="tradingview_chart" 
        ref={containerRef} 
        className="h-[500px] w-full"
      />
    </div>
  );
};

export default TradingViewChart;
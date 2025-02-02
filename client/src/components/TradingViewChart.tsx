import React, { useEffect, useRef } from 'react';
import { LineChart } from 'lucide-react';
import { usePumpPortalStore } from '@/lib/pump-portal-websocket';

interface Props {
  tokenAddress: string;
}

const TradingViewChart: React.FC<Props> = ({ tokenAddress }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const trades = usePumpPortalStore(state => state.getToken(tokenAddress)?.recentTrades || []);

  // Create candlesticks from trades
  const processTradesIntoCandles = (trades: any[]) => {
    const candles = new Map();

    trades.forEach(trade => {
      const timestamp = Math.floor(trade.timestamp / 60000) * 60000; // 1 minute candles

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

    return Array.from(candles.values()).sort((a, b) => a.time - b.time);
  };

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/tv.js';
    script.async = true;

    script.onload = () => {
      if (!containerRef.current || !window.TradingView) return;

      // Create widget with our data feed
      const widget = new window.TradingView.widget({
        container_id: containerRef.current.id,
        height: 500,
        width: '100%',
        theme: 'dark',
        style: '1', // Candlestick
        toolbar_bg: '#0D0B1F',
        library_path: '/charting_library/',
        custom_css_url: '/tradingview-dark.css',
        disabled_features: [
          'header_symbol_search',
          'symbol_search_hot_key',
          'header_compare',
          'header_undo_redo',
          'header_screenshot',
          'header_saveload'
        ],
        enabled_features: [
          'study_templates',
          'create_volume_indicator_by_default',
        ],
        charts_storage_url: 'https://saveload.tradingview.com',
        client_id: 'tradingview.com',
        user_id: 'public_user',
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
              name: `${tokenAddress.slice(0, 8)}`,
              description: `Token: ${tokenAddress.slice(0, 6)}...${tokenAddress.slice(-4)}`,
              timezone: 'Etc/UTC',
              minmov: 1,
              pricescale: 100000000,
              has_intraday: true,
              has_daily: true,
              has_weekly_and_monthly: false,
              session: '24x7',
              supported_resolutions: ['1', '5', '15', '30', '60'],
              type: 'crypto',
              currency_code: 'USD',
              volume_precision: 8
            });
          },
          getBars: (symbolInfo: any, resolution: string, from: number, to: number, onHistoryCallback: any) => {
            if (trades.length === 0) {
              onHistoryCallback([], { noData: true });
              return;
            }
            const bars = processTradesIntoCandles(trades);
            onHistoryCallback(bars, { noData: false });
          },
          subscribeBars: (symbolInfo: any, resolution: string, onRealtimeCallback: any) => {
            const updateInterval = setInterval(() => {
              if (trades.length > 0) {
                const lastTrade = trades[0];
                const timestamp = Math.floor(lastTrade.timestamp / 60000) * 60000;

                onRealtimeCallback({
                  time: timestamp,
                  open: lastTrade.priceInUsd,
                  high: lastTrade.priceInUsd,
                  low: lastTrade.priceInUsd,
                  close: lastTrade.priceInUsd,
                  volume: lastTrade.tokenAmount
                });
              }
            }, 1000);

            return () => clearInterval(updateInterval);
          },
          unsubscribeBars: () => {}
        }
      });
    };

    document.head.appendChild(script);
    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, [tokenAddress, trades]);

  return (
    <div className="relative bg-[#0D0B1F] rounded-lg p-4 border border-purple-900/30">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <LineChart className="w-5 h-5 text-purple-400" />
          <h2 className="text-purple-100 font-semibold">
            Live Price Chart ({tokenAddress.slice(0, 6)}...{tokenAddress.slice(-4)})
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
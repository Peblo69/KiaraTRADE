
import React, { useEffect, useRef } from 'react';
import { LineChart } from 'lucide-react';
import { usePumpPortalStore } from '@/lib/pump-portal-websocket';

interface Props {
  tokenAddress: string;
}

const TradingChart: React.FC<Props> = ({ tokenAddress }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  
  const token = usePumpPortalStore(state => state.getToken(tokenAddress));
  const solPrice = usePumpPortalStore(state => state.solPrice);
  const trades = token?.recentTrades || [];

  useEffect(() => {
    console.log('Chart Debug:', {
      hasToken: !!token,
      tradesCount: trades.length,
      firstTrade: trades[0],
      solPrice
    });

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/tv.js';
    script.async = true;
    
    script.onload = () => {
      if (!containerRef.current || !window.TradingView) return;

      const widget = new window.TradingView.widget({
        container_id: containerRef.current.id,
        symbol: `SOL:${tokenAddress.slice(0, 8)}`,
        interval: '1',
        timezone: 'Etc/UTC',
        theme: 'dark',
        style: '1',
        locale: 'en',
        toolbar_bg: '#0D0B1F',
        enable_publishing: false,
        hide_side_toolbar: false,
        allow_symbol_change: false,
        save_image: false,
        height: 500,
        width: '100%',
        datafeed: {
          onReady: (callback: any) => {
            callback({
              supported_resolutions: ['1', '5', '15', '30', '60']
            });
          },
          resolveSymbol: (symbolName: string, onSymbolResolvedCallback: any) => {
            onSymbolResolvedCallback({
              name: `${token?.symbol || tokenAddress.slice(0, 8)}`,
              description: token?.name || 'Token',
              type: 'crypto',
              session: '24x7',
              timezone: 'Etc/UTC',
              minmov: 1,
              pricescale: 1000000000,
              has_intraday: true,
              has_no_volume: false,
              volume_precision: 8,
              data_status: 'streaming'
            });
          },
          getBars: (symbolInfo: any, resolution: string, from: number, to: number, onHistoryCallback: any) => {
            if (!trades.length) {
              onHistoryCallback([], { noData: true });
              return;
            }

            const interval = parseInt(resolution) * 60 * 1000;
            const bars = new Map();

            trades.forEach(trade => {
              const timestamp = Math.floor(trade.timestamp / interval) * interval;
              
              if (!bars.has(timestamp)) {
                bars.set(timestamp, {
                  time: timestamp / 1000,
                  open: trade.priceInUsd,
                  high: trade.priceInUsd,
                  low: trade.priceInUsd,
                  close: trade.priceInUsd,
                  volume: trade.tokenAmount
                });
              } else {
                const bar = bars.get(timestamp);
                bar.high = Math.max(bar.high, trade.priceInUsd);
                bar.low = Math.min(bar.low, trade.priceInUsd);
                bar.close = trade.priceInUsd;
                bar.volume += trade.tokenAmount;
              }
            });

            onHistoryCallback(Array.from(bars.values()), { noData: false });
          },
          subscribeBars: (symbolInfo: any, resolution: string, onRealtimeCallback: any) => {
            if (trades[0]) {
              onRealtimeCallback({
                time: trades[0].timestamp / 1000,
                open: trades[0].priceInUsd,
                high: trades[0].priceInUsd,
                low: trades[0].priceInUsd,
                close: trades[0].priceInUsd,
                volume: trades[0].tokenAmount
              });
            }
          },
          unsubscribeBars: () => {}
        },
        studies: [
          'Volume@tv-basicstudies'
        ],
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
    };

    document.head.appendChild(script);
    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, [tokenAddress, token, trades, solPrice]);

  return (
    <div className="relative bg-[#0D0B1F] rounded-lg p-4 border border-purple-900/30">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <LineChart className="w-5 h-5 text-purple-400" />
          <h2 className="text-purple-100 font-semibold">
            {token?.symbol || tokenAddress.slice(0, 6)}... Live Chart
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

export default TradingChart;

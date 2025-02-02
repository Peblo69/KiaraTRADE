import React, { useEffect, useRef } from 'react';
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
  const token = usePumpPortalStore(state => state.getToken(tokenAddress));
  const trades = token?.recentTrades || [];

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Generate a unique container ID
    const containerId = `tradingview_${Math.random().toString(36).substring(7)}`;
    container.id = containerId;

    const widget = new window.TradingView.widget({
      container_id: containerId,
      autosize: true,
      symbol: token?.symbol || 'Unknown',
      interval: '1',
      timezone: 'Etc/UTC',
      theme: 'dark',
      style: '1',
      locale: 'en',
      toolbar_bg: '#0D0B1F',
      enable_publishing: false,
      hide_side_toolbar: false,
      allow_symbol_change: false,
      height: 500,
      save_image: false,
      datafeed: {
        onReady: (callback: any) => {
          callback({
            supported_resolutions: ['1', '5', '15', '30', '60']
          });
        },
        getBars: (symbolInfo: any, resolution: string, from: number, to: number, onHistoryCallback: any) => {
          const bars = trades.map(trade => ({
            time: trade.timestamp,
            open: trade.priceInUsd,
            high: trade.priceInUsd,
            low: trade.priceInUsd,
            close: trade.priceInUsd,
            volume: trade.tokenAmount
          }));
          onHistoryCallback(bars);
        },
        subscribeBars: (symbolInfo: any, resolution: string, onRealtimeCallback: any) => {
          if (trades[0]) {
            onRealtimeCallback({
              time: trades[0].timestamp,
              open: trades[0].priceInUsd,
              high: trades[0].priceInUsd,
              low: trades[0].priceInUsd,
              close: trades[0].priceInUsd,
              volume: trades[0].tokenAmount
            });
          }
        },
        unsubscribeBars: () => {},
        resolveSymbol: (symbolName: string, onSymbolResolvedCallback: any) => {
          onSymbolResolvedCallback({
            name: token?.symbol || 'Unknown',
            description: token?.name || 'Unknown Token',
            type: 'crypto',
            session: '24x7',
            timezone: 'Etc/UTC',
            minmov: 1,
            pricescale: 1000000000,
            has_intraday: true,
            supported_resolutions: ['1', '5', '15', '30', '60']
          });
        }
      }
    });

    return () => {
      if (container) {
        container.innerHTML = '';
      }
    };
  }, [token, trades, tokenAddress]);

  return (
    <div className="relative bg-[#0D0B1F] rounded-lg p-4 border border-purple-900/30">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <LineChart className="w-5 h-5 text-purple-400" />
          <h2 className="text-purple-100 font-semibold">
            {token?.symbol || 'Unknown'} Live Chart
          </h2>
        </div>
      </div>
      <div ref={containerRef} className="h-[500px] w-full" />
    </div>
  );
};

export default TradingChart;
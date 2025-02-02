import React, { useEffect, useRef } from 'react';
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

  // Create custom data feed
  const createDatafeed = () => {
    return {
      onReady: (callback: any) => {
        callback({
          supported_resolutions: ['1', '5', '15', '30', '60'],
          timezone: 'Etc/UTC'
        });
      },

      searchSymbols: () => {},

      resolveSymbol: (symbolName: string, onSymbolResolvedCallback: any) => {
        onSymbolResolvedCallback({
          name: tokenAddress,
          ticker: tokenAddress,
          type: 'crypto',
          session: '24x7',
          timezone: 'Etc/UTC',
          minmov: 1,
          pricescale: 100000000, // Adjust based on your token decimals
          has_intraday: true,
          supported_resolutions: ['1', '5', '15', '30', '60'],
          volume_precision: 8,
          data_status: 'streaming'
        });
      },

      getBars: async (
        symbolInfo: any,
        resolution: string,
        periodParams: any,
        onHistoryCallback: any,
        onErrorCallback: any
      ) => {
        try {
          // Convert your trades to OHLCV format
          const bars = convertTradesToBars(trades, resolution, periodParams.from * 1000, periodParams.to * 1000);
          onHistoryCallback(bars, { noData: bars.length === 0 });
        } catch (error) {
          onErrorCallback(error);
        }
      },

      subscribeBars: (
        symbolInfo: any,
        resolution: string,
        onRealtimeCallback: any,
        subscriberUID: string
      ) => {
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

      unsubscribeBars: (subscriberUID: string) => {
        clearInterval(subscriberUID as unknown as number);
      }
    };
  };

  // Convert trades to OHLCV bars
  const convertTradesToBars = (trades: any[], resolution: string, from: number, to: number) => {
    const interval = parseInt(resolution) * 60 * 1000; // Convert to milliseconds
    const bars: any[] = [];
    let currentBar: any = null;

    trades
      .filter(trade => trade.timestamp >= from && trade.timestamp <= to)
      .forEach(trade => {
        const barTime = Math.floor(trade.timestamp / interval) * interval;

        if (!currentBar || currentBar.time !== barTime) {
          if (currentBar) {
            bars.push(currentBar);
          }
          currentBar = {
            time: barTime,
            open: trade.priceInUsd,
            high: trade.priceInUsd,
            low: trade.priceInUsd,
            close: trade.priceInUsd,
            volume: trade.tokenAmount
          };
        } else {
          currentBar.high = Math.max(currentBar.high, trade.priceInUsd);
          currentBar.low = Math.min(currentBar.low, trade.priceInUsd);
          currentBar.close = trade.priceInUsd;
          currentBar.volume += trade.tokenAmount;
        }
      });

    if (currentBar) {
      bars.push(currentBar);
    }

    return bars;
  };

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/tv.js';
    script.async = true;
    script.onload = () => {
      if (!containerRef.current || !window.TradingView) return;

      new window.TradingView.widget({
        container_id: containerRef.current.id,
        symbol: tokenAddress,
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
        width: '100%',
        custom_css_url: '/tradingview-dark.css',
        datafeed: createDatafeed(),
        library_path: '/charting_library/',
         overrides: {
          "mainSeriesProperties.candleStyle.upColor": "#26a69a",
          "mainSeriesProperties.candleStyle.downColor": "#ef5350",
          "mainSeriesProperties.candleStyle.wickUpColor": "#26a69a",
          "mainSeriesProperties.candleStyle.wickDownColor": "#ef5350"
        },
      });
    };

    document.head.appendChild(script);
    return () => {
      document.head.removeChild(script);
    };
  }, [tokenAddress]);

  return (
    <div className="relative bg-[#0D0B1F] rounded-lg p-4 border border-purple-900/30">
      <div className="flex items-center space-x-2 mb-4">
        <LineChart className="w-5 h-5 text-purple-400" />
        <h2 className="text-purple-100 font-semibold">Live Price Chart</h2>
      </div>
      <div 
        id="tradingview_widget" 
        ref={containerRef} 
        className="h-[500px]"
      />
    </div>
  );
};

export default TradingViewChart;
import React, { useEffect, useRef, useState } from 'react';

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

export const TradingChart: React.FC<Props> = ({
  tokenAddress,
  data,
  onTimeframeChange,
  timeframe = '1m'
}) => {
  const container = useRef<HTMLDivElement>(null);
  const [error, setError] = useState(false);
  const widgetRef = useRef<any>(null);
  const lastDataRef = useRef<Props['data']>([]);

  const initializeWidget = () => {
    if (!container.current || !window.TradingView) return;

    const symbol = tokenAddress.slice(0, 8); // Use shortened address as symbol
    widgetRef.current = new window.TradingView.widget({
      container_id: container.current.id,
      autosize: true,
      symbol,
      interval: timeframe,
      timezone: "Etc/UTC",
      theme: "dark",
      style: "1",
      locale: "en",
      toolbar_bg: "#161b2b",
      enable_publishing: false,
      hide_side_toolbar: false,
      allow_symbol_change: false,
      save_image: false,
      studies: ["Volume@tv-basicstudies"],
      show_popup_button: false,
      popup_width: "1000",
      popup_height: "650",
      loading_screen: { backgroundColor: "#161b2b" },
      custom_css_url: "/tradingview-dark.css",
      datafeed: {
        onReady: (callback: (config: any) => void) => {
          setTimeout(() => callback({
            supported_resolutions: ["1", "5", "15", "30", "60", "240", "D"],
            exchanges: [{ value: "local", name: "Local", desc: "Local Exchange" }],
            symbols_types: [{ name: "crypto", value: "crypto" }],
          }), 0);
        },

        searchSymbols: () => {},

        resolveSymbol: (symbolName: string, onSymbolResolvedCallback: (symbolInfo: any) => void) => {
          setTimeout(() => {
            onSymbolResolvedCallback({
              name: symbolName,
              full_name: symbolName,
              description: tokenAddress,
              type: "crypto",
              session: "24x7",
              timezone: "Etc/UTC",
              minmov: 1,
              pricescale: 100000000, // 8 decimal places
              has_intraday: true,
              has_daily: true,
              has_weekly_and_monthly: false,
              supported_resolutions: ["1", "5", "15", "30", "60", "240", "D"],
              volume_precision: 8,
              data_status: "streaming",
            });
          }, 0);
        },

        getBars: async (
          symbolInfo: any,
          resolution: string,
          periodParams: {
            from: number;
            to: number;
            firstDataRequest: boolean;
          },
          onHistoryCallback: (bars: any[], { noData: boolean }) => void,
          onErrorCallback: (error: string) => void
        ) => {
          try {
            if (!data || data.length === 0) {
              onHistoryCallback([], { noData: true });
              return;
            }

            // Filter data based on time range
            const bars = data.filter(bar => 
              bar.time >= periodParams.from && bar.time <= periodParams.to
            );

            lastDataRef.current = bars;
            onHistoryCallback(bars, { noData: bars.length === 0 });
          } catch (err) {
            console.error('Error loading bars:', err);
            onErrorCallback('Failed to load data');
          }
        },

        subscribeBars: (
          symbolInfo: any,
          resolution: string,
          onRealtimeCallback: (bar: any) => void,
          subscriberUID: string,
          onResetCacheNeededCallback: () => void
        ) => {
          // We'll update through the data prop changes
          const lastBar = data[data.length - 1];
          if (lastBar && (!lastDataRef.current.length || lastBar.time !== lastDataRef.current[lastDataRef.current.length - 1]?.time)) {
            onRealtimeCallback(lastBar);
            lastDataRef.current = [...lastDataRef.current, lastBar];
          }
        },

        unsubscribeBars: () => {
          // Cleanup subscription if needed
        }
      }
    });
  };

  const handleError = () => {
    setError(true);
  };

  const handleReconnect = () => {
    setError(false);
    if (container.current) {
      // Clean up old widget
      while (container.current.firstChild) {
        container.current.removeChild(container.current.firstChild);
      }
      // Reinitialize
      initializeWidget();
    }
  };

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/tv.js';
    script.async = true;
    script.onerror = handleError;
    script.onload = initializeWidget;
    document.head.appendChild(script);

    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, []);

  // Update data when props change
  useEffect(() => {
    if (data.length > 0 && widgetRef.current?.activeChart?.() && !error) {
      const lastBar = data[data.length - 1];
      if (lastBar && (!lastDataRef.current.length || lastBar.time !== lastDataRef.current[lastDataRef.current.length - 1]?.time)) {
        lastDataRef.current = [...lastDataRef.current, lastBar];
      }
    }
  }, [data, error]);

  if (error) {
    return (
      <div className="w-full h-[500px] bg-[#161b2b] rounded-lg flex flex-col items-center justify-center gap-4">
        <div className="text-gray-300 text-lg">Failed to load chart</div>
        <button
          onClick={handleReconnect}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        >
          Reconnect
        </button>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-[#161b2b] rounded-lg overflow-hidden">
      <div 
        id={`tradingview_${tokenAddress}`}
        ref={container}
        className="w-full h-[500px]"
      />
    </div>
  );
};

export default TradingChart;
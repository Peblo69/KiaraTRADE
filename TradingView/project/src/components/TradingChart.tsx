import React, { useEffect, useRef } from 'react';

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

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/tv.js';
    script.async = true;
    script.onload = () => {
      if (container.current && window.TradingView) {
        new window.TradingView.widget({
          container_id: container.current.id,
          autosize: true,
          symbol: tokenAddress,
          interval: timeframe,
          timezone: "Etc/UTC",
          theme: "dark",
          style: "1",
          locale: "en",
          toolbar_bg: "#f1f3f6",
          enable_publishing: false,
          hide_side_toolbar: false,
          allow_symbol_change: false,
          save_image: false,
          studies: ["Volume@tv-basicstudies"],
          show_popup_button: false,
          popup_width: "1000",
          popup_height: "650",
          datafeed: {
            onReady: (callback: (config: any) => void) => {
              callback({
                supported_resolutions: ["1", "5", "15", "30", "60", "240", "D"],
                exchanges: [{ value: "pump", name: "Pump", desc: "Pump Exchange" }],
                symbols_types: [{ name: "crypto", value: "crypto" }],
              });
            },
            searchSymbols: () => {},
            resolveSymbol: (symbolName: string, onSymbolResolvedCallback: (symbolInfo: any) => void) => {
              onSymbolResolvedCallback({
                name: symbolName,
                full_name: symbolName,
                description: symbolName,
                type: "crypto",
                session: "24x7",
                timezone: "Etc/UTC",
                minmov: 1,
                pricescale: 100000000, // 8 decimal places
                has_intraday: true,
                supported_resolutions: ["1", "5", "15", "30", "60", "240", "D"],
                volume_precision: 8,
                data_status: "streaming",
              });
            },
            getBars: (symbolInfo: any, resolution: string, periodParams: any, onHistoryCallback: any) => {
              if (data && data.length > 0) {
                onHistoryCallback(data);
              } else {
                onHistoryCallback([], { noData: true });
              }
            },
            subscribeBars: (symbolInfo: any, resolution: string, onRealtimeCallback: any) => {
              // Handle real-time updates through the parent's data prop updates
              if (data && data.length > 0) {
                onRealtimeCallback(data[data.length - 1]);
              }
            },
            unsubscribeBars: () => {},
          }
        });
      }
    };
    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
    };
  }, [data, timeframe, tokenAddress]);

  return (
    <div className="w-full h-full bg-[#0D0B1F] rounded-lg overflow-hidden">
      <div 
        id={`tradingview_${tokenAddress}`}
        ref={container}
        className="w-full h-[500px]"
      />
    </div>
  );
};

export default TradingChart;
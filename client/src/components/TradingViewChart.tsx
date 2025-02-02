import React, { useEffect, useRef } from 'react';
import { LineChart } from 'lucide-react';

declare global {
  interface Window {
    TradingView: any;
  }
}

interface Props {
  tokenAddress: string;
  symbol?: string;  // e.g., "SOLUSDT"
}

const TradingViewChart: React.FC<Props> = ({ tokenAddress, symbol = 'SOLUSDT' }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load TradingView widget script
    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/tv.js';
    script.async = true;
    script.onload = initChart;
    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
    };
  }, []);

  const initChart = () => {
    if (!containerRef.current || !window.TradingView) return;

    new window.TradingView.widget({
      container_id: containerRef.current.id,
      symbol: symbol,
      interval: '1',
      timezone: 'Etc/UTC',
      theme: 'dark',
      style: '1', // Candles
      locale: 'en',
      toolbar_bg: '#0D0B1F',
      enable_publishing: false,
      hide_side_toolbar: false,
      allow_symbol_change: true,
      save_image: false,
      height: 500,
      width: '100%',
      studies: [
        'Volume@tv-basicstudies',
        'MACD@tv-basicstudies',
        'RSI@tv-basicstudies'
      ],
      custom_css_url: '/tradingview-dark.css',
      overrides: {
        "mainSeriesProperties.candleStyle.upColor": "#26a69a",
        "mainSeriesProperties.candleStyle.downColor": "#ef5350",
        "mainSeriesProperties.candleStyle.wickUpColor": "#26a69a",
        "mainSeriesProperties.candleStyle.wickDownColor": "#ef5350"
      },
      disabled_features: [
        'header_symbol_search',
        'header_screenshot',
        'header_compare',
      ],
      enabled_features: [
        'hide_left_toolbar_by_default',
        'study_templates',
        'create_volume_indicator_by_default',
      ],
    });
  };

  return (
    <div className="relative bg-[#0D0B1F] rounded-lg p-4 border border-purple-900/30">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <LineChart className="w-5 h-5 text-purple-400" />
          <h2 className="text-purple-100 font-semibold">TradingView Chart</h2>
        </div>
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

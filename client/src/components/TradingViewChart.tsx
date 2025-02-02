import React, { useEffect, useRef } from 'react';
import { LineChart } from 'lucide-react';

declare global {
  interface Window {
    TradingView: any;
  }
}

interface Props {
  symbol?: string;
}

const TradingViewChart: React.FC<Props> = ({ symbol = 'BTCUSDT' }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/tv.js';
    script.async = true;
    script.onload = () => {
      if (!containerRef.current || !window.TradingView) return;

      new window.TradingView.widget({
        width: '100%',
        height: 500,
        symbol: symbol,
        interval: '1',
        timezone: 'Etc/UTC',
        theme: 'dark',
        style: '1',
        locale: 'en',
        toolbar_bg: '#0D0B1F',
        enable_publishing: false,
        allow_symbol_change: true,
        container_id: containerRef.current.id,
        hide_side_toolbar: false,
        studies: ['Volume@tv-basicstudies']
      });
    };

    document.head.appendChild(script);
    return () => {
      document.head.removeChild(script);
    };
  }, [symbol]);

  return (
    <div className="relative bg-[#0D0B1F] rounded-lg p-4 border border-purple-900/30">
      <div className="flex items-center space-x-2 mb-4">
        <LineChart className="w-5 h-5 text-purple-400" />
        <h2 className="text-purple-100 font-semibold">Live Chart</h2>
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
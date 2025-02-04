
import React, { useEffect, useRef, useState } from 'react';
import { usePumpPortalStore } from '@/lib/pump-portal-websocket';

interface TradingChartProps {
  tokenAddress: string;
}

declare global {
  interface Window {
    TradingView: any;
  }
}

const TradingChart: React.FC<TradingChartProps> = ({ tokenAddress }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<any>(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const token = usePumpPortalStore(state => state.tokens.find(t => t.address === tokenAddress));

  useEffect(() => {
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = 'https://s3.tradingview.com/tv.js';
    script.async = true;
    script.onload = () => setScriptLoaded(true);
    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
    };
  }, []);

  useEffect(() => {
    if (!chartContainerRef.current || !token || !scriptLoaded || !window.TradingView) return;

    if (widgetRef.current) {
      widgetRef.current.remove();
    }

    widgetRef.current = new window.TradingView.widget({
      autosize: true,
      symbol: `BINANCE:${token.symbol}USDT`,
      interval: '1',
      timezone: 'Etc/UTC',
      theme: 'dark',
      style: '1',
      locale: 'en',
      toolbar_bg: '#f1f3f6',
      enable_publishing: false,
      allow_symbol_change: true,
      container_id: chartContainerRef.current.id,
      hide_side_toolbar: false,
      studies: [
        'RSI@tv-basicstudies',
        'MASimple@tv-basicstudies',
        'VWAP@tv-basicstudies'
      ]
    });

    return () => {
      if (widgetRef.current) {
        widgetRef.current.remove();
      }
    };
  }, [token, scriptLoaded]);

  return (
    <div 
      id="tradingview_chart" 
      ref={chartContainerRef} 
      className="w-full h-full min-h-[500px]"
    />
  );
};

export default TradingChart;

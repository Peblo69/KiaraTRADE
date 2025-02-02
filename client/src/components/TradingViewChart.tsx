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

  useEffect(() => {
    // Debug log to see what data we're getting
    console.log('Token Address:', tokenAddress);
    console.log('Initial Trades:', trades);

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/tv.js';
    script.async = true;

    script.onload = () => {
      if (!containerRef.current || !window.TradingView) return;

      // Create widget with basic config first
      const widget = new window.TradingView.widget({
        container_id: containerRef.current.id,
        // Use a default symbol first
        symbol: 'BINANCE:BTCUSDT',  // We'll change this
        interval: '1',
        timezone: 'Etc/UTC',
        theme: 'dark',
        style: '1',
        locale: 'en',
        toolbar_bg: '#0D0B1F',
        enable_publishing: false,
        hide_side_toolbar: false,
        allow_symbol_change: true,  // Let's keep this true for testing
        save_image: false,
        height: 500,
        width: '100%',
        studies: [
          'Volume@tv-basicstudies',
        ],
        loading_screen: { backgroundColor: "#0D0B1F" },
        favorites: {
          intervals: ['1', '5', '15', '30', '60']
        }
      });

      // Debug: Log widget creation
      console.log('TradingView Widget Created');

      widget.onChartReady(() => {
        console.log('Chart is ready!');
        // Here you can start updating with your data
      });
    };

    document.head.appendChild(script);

    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, [tokenAddress]);

  return (
    <div className="relative bg-[#0D0B1F] rounded-lg p-4 border border-purple-900/30">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <LineChart className="w-5 h-5 text-purple-400" />
          <h2 className="text-purple-100 font-semibold">
            Live Price Chart - {tokenAddress.slice(0, 6)}...
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
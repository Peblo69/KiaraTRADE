import React, { useEffect, useRef } from 'react';
import { usePumpPortalStore } from '@/lib/pump-portal-websocket';

interface TradingChartProps {
  tokenAddress?: string;
}

const TradingChart: React.FC<TradingChartProps> = ({ tokenAddress }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<any>(null);

  // Get token data from store based on tokenAddress
  const token = usePumpPortalStore(state => 
    tokenAddress ? state.getToken(tokenAddress) : null
  );

  useEffect(() => {
    if (!chartContainerRef.current || !token || !tokenAddress) return;

    // Cleanup previous widget instance
    if (widgetRef.current) {
      widgetRef.current.remove();
    }

    // Initialize TradingView widget
    widgetRef.current = new window.TradingView.widget({
      container_id: chartContainerRef.current,
      symbol: `BINANCE:${token.symbol}USD`, // Adjust symbol format as needed
      interval: '1',
      timezone: 'Etc/UTC',
      theme: 'dark',
      style: '1',
      locale: 'en',
      toolbar_bg: '#f1f3f6',
      enable_publishing: false,
      allow_symbol_change: true,
      details: true,
      hide_side_toolbar: false,
      withdateranges: true,
      save_image: false,
      studies: ['MACD@tv-basicstudies'],
      show_popup_button: true,
      popup_width: '1000',
      popup_height: '650',
      // Other TradingView widget configurations...
    });

    // Cleanup on unmount
    return () => {
      if (widgetRef.current) {
        widgetRef.current.remove();
      }
    };
  }, [token, tokenAddress]); // Re-run when token or tokenAddress changes

  return (
    <div className="relative bg-[#0D0B1F] rounded-lg p-4 border border-purple-900/30">
      <div className="h-[600px]" ref={chartContainerRef} />
    </div>
  );
};

export default TradingChart;
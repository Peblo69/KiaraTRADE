import { useEffect, useRef } from 'react';
import { Card } from "@/components/ui/card";

declare global {
  interface Window {
    TradingView: any;
  }
}

export default function TradingChart() {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/tv.js';
    script.async = true;
    script.onload = () => {
      if (container.current && window.TradingView) {
        new window.TradingView.widget({
          container_id: container.current.id,
          width: "100%",
          height: "400",
          symbol: "BINANCE:BTCUSDT",
          interval: "D",
          timezone: "Etc/UTC",
          theme: "dark",
          style: "1",
          locale: "en",
          toolbar_bg: "#f1f3f6",
          enable_publishing: false,
          hide_side_toolbar: false,
          allow_symbol_change: true,
          details: true,
          studies: ["RSI@tv-basicstudies"],
          container: container.current,
        });
      }
    };
    document.head.appendChild(script);

    return () => {
      script.remove();
    };
  }, []);

  return (
    <Card className="p-4 backdrop-blur-sm bg-transparent border-purple-500/20">
      <div 
        id="tradingview_chart"
        ref={container}
        className="w-full h-[400px]"
      />
    </Card>
  );
}

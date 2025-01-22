import React from 'react';
import { AdvancedChart } from "react-tradingview-embed";

interface TradingViewChartProps {
  symbol: string;
  containerHeight?: string | number;
  interval?: string;
  containerId?: string;
}

const TradingViewChart: React.FC<TradingViewChartProps> = ({
  symbol,
  containerHeight = 500,
  interval = "1",
  containerId = "tradingview_chart"
}) => {
  // Handle invalid symbols gracefully
  if (!symbol) {
    return (
      <div 
        style={{ height: containerHeight }}
        className="flex items-center justify-center bg-background/50"
      >
        <p className="text-muted-foreground">No price data available</p>
      </div>
    );
  }

  return (
    <div style={{ height: containerHeight }}>
      <AdvancedChart
        widgetProps={{
          symbol: `CRYPTO:${symbol}USDT`,
          interval,
          timezone: "Etc/UTC",
          theme: "dark",
          style: "1",
          locale: "en",
          enable_publishing: false,
          hide_side_toolbar: false,
          container_id: containerId
        }}
      />
    </div>
  );
};

export default TradingViewChart;
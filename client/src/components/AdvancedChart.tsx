import { FC } from 'react';
import { AdvancedChart } from "react-tradingview-embed";
import { Card } from '@/components/ui/card';

interface ChartProps {
  symbol: string;
  className?: string;
}

export const ChartComponent: FC<ChartProps> = ({ symbol, className }) => {
  // Convert our symbol to TradingView format
  const tvSymbol = `SOLANA:${symbol.replace('-USDT', '')}USD`;

  return (
    <Card className={`w-full h-[600px] ${className}`}>
      <AdvancedChart 
        widgetProps={{
          theme: "dark",
          symbol: tvSymbol,
          interval: "1",
          timezone: "Etc/UTC",
          style: "1",
          locale: "en",
          toolbar_bg: "#f1f3f6",
          enable_publishing: false,
          allow_symbol_change: true,
          container_id: "tradingview_chart",
          height: "100%",
          width: "100%",
          studies: [
            "RSI@tv-basicstudies",
            "MASimple@tv-basicstudies",
            "VWAP@tv-basicstudies"
          ],
          disabled_features: [
            "header_symbol_search",
            "header_screenshot",
            "header_compare",
            "header_saveload"
          ],
          enabled_features: [
            "hide_left_toolbar_by_default",
            "use_localstorage_for_settings",
            "save_chart_properties_to_local_storage"
          ],
        }}
      />
    </Card>
  );
};

export default ChartComponent;
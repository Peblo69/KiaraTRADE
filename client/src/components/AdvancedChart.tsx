import { FC } from 'react';
import { AdvancedChart } from "react-tradingview-embed";
import { Card } from '@/components/ui/card';

interface ChartProps {
  symbol: string;
  className?: string;
}

export const ChartComponent: FC<ChartProps> = ({ symbol, className }) => {
  // Convert our symbol to TradingView format
  const tvSymbol = `CRYPTO:${symbol.replace('-USDT', '')}USDT`;

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
          enable_publishing: false,
          allow_symbol_change: true,
          hide_side_toolbar: false,
          container_id: "tradingview_chart",
          height: "100%",
          width: "100%",
          studies: [
            "MASimple@tv-basicstudies",
            "Volume@tv-basicstudies",
            "MACD@tv-basicstudies",
            "RSI@tv-basicstudies"
          ],
          disabled_features: [
            "header_symbol_search",
            "header_screenshot",
            "header_compare"
          ],
          enabled_features: [
            "create_volume_indicator_by_default",
            "use_localstorage_for_settings",
            "save_chart_properties_to_local_storage"
          ],
          loading_screen: { backgroundColor: "#131722" },
          overrides: {
            "mainSeriesProperties.candleStyle.upColor": "#26a69a",
            "mainSeriesProperties.candleStyle.downColor": "#ef5350",
            "mainSeriesProperties.candleStyle.borderUpColor": "#26a69a",
            "mainSeriesProperties.candleStyle.borderDownColor": "#ef5350",
            "mainSeriesProperties.candleStyle.wickUpColor": "#26a69a",
            "mainSeriesProperties.candleStyle.wickDownColor": "#ef5350",
            "paneProperties.background": "#131722",
            "paneProperties.vertGridProperties.color": "#363c4e",
            "paneProperties.horzGridProperties.color": "#363c4e",
            "scalesProperties.textColor": "#AAA",
            "scalesProperties.lineColor": "#363c4e",
            "paneProperties.legendProperties.showStudyArguments": true,
            "paneProperties.legendProperties.showStudyTitles": true,
            "paneProperties.legendProperties.showStudyValues": true,
            "paneProperties.legendProperties.showSeriesTitle": true,
            "paneProperties.legendProperties.showSeriesOHLC": true,
          }
        }}
      />
    </Card>
  );
};

export default ChartComponent;
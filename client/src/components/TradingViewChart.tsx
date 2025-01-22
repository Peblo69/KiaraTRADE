import React, { useEffect, useRef } from 'react';
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
  const chartContainerRef = useRef<HTMLDivElement>(null);

  return (
    <div ref={chartContainerRef} style={{ height: containerHeight }}>
      <AdvancedChart
        widgetProps={{
          symbol: `CRYPTO:${symbol}USDT`,
          interval,
          timezone: "Etc/UTC",
          theme: "dark",
          style: "1",
          locale: "en",
          enable_publishing: false,
          allow_symbol_change: true,
          container_id: containerId,
          autosize: true,
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
            "use_localstorage_for_settings"
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
            "paneProperties.legendProperties.showSeriesOHLC": true
          }
        }}
      />
    </div>
  );
};

export default TradingViewChart;

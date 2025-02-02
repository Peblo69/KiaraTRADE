import React, { useEffect, useRef } from "react";
import { LineChart } from "lucide-react";
import {
  createChart,
  IChartApi,
  ColorType,
  CandlestickSeries,
  HistogramSeries,
} from "lightweight-charts";

interface Props {
  tokenAddress: string;
  data?: {
    time: number | string; // time can be a UNIX timestamp (number) or string (e.g. "2018-12-22")
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }[];
  timeframe?: string;
}

export const TradingChart: React.FC<Props> = ({
  tokenAddress,
  data = [],
  timeframe = "1m",
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Define chart configuration options
    const chartOptions = {
      layout: {
        background: { type: ColorType.Solid, color: "#161b2b" },
        textColor: "#d1d4dc",
      },
      grid: {
        vertLines: { color: "rgba(42, 46, 57, 0.2)" },
        horzLines: { color: "rgba(42, 46, 57, 0.2)" },
      },
      crosshair: {
        vertLine: {
          color: "#758696",
          width: 1,
          labelBackgroundColor: "#161b2b",
        },
        horzLine: {
          color: "#758696",
          width: 1,
          labelBackgroundColor: "#161b2b",
        },
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        tickMarkFormatter: (time: number) => {
          const date = new Date(time * 1000);
          // Format the tick mark as HH:MM
          return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        },
      },
      rightPriceScale: {
        borderColor: "#485c7b",
        scaleMargins: {
          top: 0.1,
          bottom: 0.2,
        },
      },
    };

    // Create the chart instance
    const chart = createChart(containerRef.current, {
      ...chartOptions,
      width: containerRef.current.clientWidth,
      height: 500,
    });

    // Add the candlestick series with proper styling
    const candleSeries = chart.addCandlestickSeries({
      upColor: "#26a69a",
      downColor: "#ef5350",
      borderVisible: false,
      wickUpColor: "#26a69a",
      wickDownColor: "#ef5350",
    });

    // Add a histogram series for volume, placed below the price chart
    const volumeSeries = chart.addHistogramSeries({
      color: "#385263",
      priceFormat: { type: "volume" },
      priceScaleId: "", // overlay on the main price scale
      scaleMargins: {
        top: 0.8, // volume occupies the bottom 20% of the chart
        bottom: 0,
      },
    });

    // If data is provided, set it for both series
    if (data.length > 0) {
      candleSeries.setData(data as any);
      volumeSeries.setData(data as any);
      chart.timeScale().fitContent();
    }

    // Handle chart resizing on window resize events
    const handleResize = () => {
      if (containerRef.current) {
        chart.applyOptions({
          width: containerRef.current.clientWidth,
        });
      }
    };
    window.addEventListener("resize", handleResize);

    // Store the chart instance for potential future use
    chartRef.current = chart;

    // Cleanup: remove event listener and dispose the chart on unmount
    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
    };
  }, [tokenAddress, data, timeframe]);

  return (
    <div className="w-full h-full bg-[#161b2b] rounded-lg overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-purple-900/30">
        <div className="flex items-center space-x-2">
          <LineChart className="w-5 h-5 text-purple-400" />
          <h2 className="text-purple-100 font-semibold">Price Chart</h2>
        </div>
      </div>
      <div ref={containerRef} className="w-full h-[500px]" />
    </div>
  );
};

export default TradingChart;

import React, { useEffect, useRef } from "react";
import { LineChart } from "lucide-react";
import { 
  createChart, 
  IChartApi, 
  ColorType, 
  CrosshairMode,
  Time
} from "lightweight-charts";

interface Props {
  tokenAddress: string;
  data?: {
    time: number;
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
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Create chart with optimized settings
    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "#0D0B1F" },
        textColor: "#9ca3af",
        fontSize: 12,
        fontFamily: "Inter, sans-serif",
      },
      grid: {
        vertLines: { color: "rgba(67, 70, 81, 0.2)" },
        horzLines: { color: "rgba(67, 70, 81, 0.2)" },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: "#758696",
          width: 1,
          style: 3,
          labelBackgroundColor: "#0D0B1F",
        },
        horzLine: {
          color: "#758696",
          width: 1,
          style: 3,
          labelBackgroundColor: "#0D0B1F",
        },
      },
      width: containerRef.current.clientWidth,
      height: 500,
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor: "#2a2e39",
        tickMarkFormatter: (time: Time) => {
          const date = new Date((time as number) * 1000);
          const hours = date.getHours().toString().padStart(2, '0');
          const minutes = date.getMinutes().toString().padStart(2, '0');
          return `${hours}:${minutes}`;
        },
      },
      rightPriceScale: {
        borderColor: "#2a2e39",
        scaleMargins: {
          top: 0.1,
          bottom: 0.2,
        },
        autoScale: true,
      },
      handleScale: {
        mouseWheel: true,
        pinch: true,
        axisPressedMouseMove: true,
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: true,
      },
    });

    // Add candlestick series with custom styling
    const candlestickSeries = chart.addCandlestickSeries({
      upColor: "#26a69a",
      downColor: "#ef5350",
      borderVisible: false,
      wickUpColor: "#26a69a",
      wickDownColor: "#ef5350",
      priceFormat: {
        type: "price",
        precision: 8,
        minMove: 0.00000001,
      },
    });

    // Add volume histogram as overlay
    const volumeSeries = chart.addHistogramSeries({
      color: "#385263",
      priceFormat: {
        type: "volume",
      },
      priceScaleId: "", // Overlay
      scaleMargins: {
        top: 0.8, // Position at bottom 20% of the chart
        bottom: 0,
      },
    });

    // Transform data for chart
    const transformedData = data.map(item => ({
      time: item.time as Time,
      open: item.open,
      high: item.high,
      low: item.low,
      close: item.close,
    }));

    const volumeData = data.map(item => ({
      time: item.time as Time,
      value: item.volume,
      color: item.close >= item.open ? "#26a69a40" : "#ef535040",
    }));

    // Set data if available
    if (transformedData.length > 0) {
      candlestickSeries.setData(transformedData);
      volumeSeries.setData(volumeData);
      chart.timeScale().fitContent();
    }

    // Handle resize with ResizeObserver
    resizeObserverRef.current = new ResizeObserver(entries => {
      const { width } = entries[0].contentRect;
      chart.applyOptions({ width });
      chart.timeScale().fitContent();
    });

    resizeObserverRef.current.observe(containerRef.current);

    // Store chart reference
    chartRef.current = chart;

    // Cleanup
    return () => {
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
      }
      chart.remove();
    };
  }, [tokenAddress, data]);

  return (
    <div className="w-full h-full bg-[#0D0B1F] rounded-lg overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-purple-900/30">
        <div className="flex items-center space-x-2">
          <LineChart className="w-5 h-5 text-purple-400" />
          <h2 className="text-purple-100 font-semibold">Price Chart</h2>
        </div>
        {/* Add timeframe selector here if needed */}
      </div>
      <div ref={containerRef} className="w-full h-[500px]" />
    </div>
  );
};

export default TradingChart;
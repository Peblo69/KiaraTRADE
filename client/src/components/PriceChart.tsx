import React, { useEffect, useRef, FC } from "react";
import { createChart, IChartApi, ColorType } from "lightweight-charts";

interface PricePoint {
  timestamp: number; // Unix timestamp in seconds
  price: number;
}

interface PriceChartProps {
  data: PricePoint[];
  symbol: string;
}

export const PriceChart: FC<PriceChartProps> = ({ data, symbol }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Define chart options for a clean price chart.
    const chartOptions = {
      layout: {
        background: { type: ColorType.Solid, color: "#0D0B1F" },
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
          labelBackgroundColor: "#0D0B1F",
        },
        horzLine: {
          color: "#758696",
          width: 1,
          labelBackgroundColor: "#0D0B1F",
        },
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        tickMarkFormatter: (time: number) => {
          const date = new Date(time * 1000);
          return date.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          });
        },
      },
      rightPriceScale: {
        borderColor: "#485c7b",
        scaleMargins: { top: 0.1, bottom: 0.1 },
      },
    };

    // Create the chart inside the container.
    const chart = createChart(chartContainerRef.current, {
      ...chartOptions,
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
    });

    // Add a line series to display price over time.
    const lineSeries = chart.addLineSeries({
      color: "#26a69a",
      lineWidth: 2,
    });

    // Map PricePoint data to the series format.
    const seriesData = data.map((point) => ({
      time: point.timestamp,
      value: point.price,
    }));

    lineSeries.setData(seriesData);
    chart.timeScale().fitContent();

    // Responsive resize handling.
    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };
    window.addEventListener("resize", handleResize);
    chartRef.current = chart;

    // Cleanup on unmount.
    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
    };
  }, [data, symbol]);

  return (
    <div className="w-full h-[120px] mt-4 bg-[#0D0B1F] rounded-lg p-4 border border-purple-900/30">
      <div ref={chartContainerRef} className="w-full h-full" />
    </div>
  );
};

export default PriceChart;

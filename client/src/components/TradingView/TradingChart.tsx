import React, { useEffect, useRef } from "react";
import { createChart, IChartApi, ColorType } from "lightweight-charts";

interface CandlestickData {
  time: number | string; // UNIX timestamp or formatted string
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface Props {
  tokenAddress: string;
  data?: CandlestickData[];
  timeframe?: string;
}

const TradingChart: React.FC<Props> = ({
  tokenAddress,
  data = [],
  timeframe = "1m",
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

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
          return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        },
      },
      rightPriceScale: {
        borderColor: "#485c7b",
        borderVisible: true,
        scaleMargins: { top: 0.1, bottom: 0.2 },
      },
    };

    const chart = createChart(containerRef.current, {
      ...chartOptions,
      width: containerRef.current.clientWidth,
      height: 500,
    });
    chartRef.current = chart;

    const candleSeries = chart.addCandlestickSeries({
      upColor: "#26a69a",
      downColor: "#ef5350",
      borderVisible: false,
      wickUpColor: "#26a69a",
      wickDownColor: "#ef5350",
    });
    const volumeSeries = chart.addHistogramSeries({
      color: "#385263",
      priceFormat: { type: "volume" },
      priceScaleId: "",
      scaleMargins: { top: 0.8, bottom: 0 },
    });

    if (data.length > 0) {
      candleSeries.setData(data);
      volumeSeries.setData(data);
      chart.timeScale().fitContent();
    }

    // If you prefer to update the chart via an interval, you can add:
    const intervalId = setInterval(() => {
      if (data.length > 0) {
        candleSeries.setData(data);
        volumeSeries.setData(data);
        chart.timeScale().fitContent();
      }
    }, 1000);

    const handleResize = () => {
      if (containerRef.current) {
        chart.applyOptions({ width: containerRef.current.clientWidth });
      }
    };
    window.addEventListener("resize", handleResize);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener("resize", handleResize);
      chart.remove();
    };
  }, [tokenAddress, data, timeframe]);

  return (
    <div className="w-full h-full bg-[#161b2b] rounded-lg overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-purple-900/30">
        <h2 className="text-purple-100 font-semibold">Real-Time Chart</h2>
      </div>
      <div ref={containerRef} className="w-full h-[500px]" />
    </div>
  );
};

export default TradingChart;

// FILE: /src/components/TradingViewChart.tsx

import React, { useEffect, useRef } from 'react';
import { createChart, CrosshairMode, IChartApi, ISeriesApi } from 'lightweight-charts';

interface TradingViewChartProps {
  trades: {
    timestamp: number;
    price: number;
    volume: number;
  }[];
}

const TradingViewChart: React.FC<TradingViewChartProps> = ({ trades }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const lineSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);

  useEffect(() => {
    if (chartContainerRef.current) {
      // Initialize the chart
      chartRef.current = createChart(chartContainerRef.current, {
        width: chartContainerRef.current.clientWidth,
        height: 400,
        layout: {
          backgroundColor: '#ffffff',
          textColor: '#000',
        },
        grid: {
          vertLines: {
            color: '#eee',
          },
          horzLines: {
            color: '#eee',
          },
        },
        crosshair: {
          mode: CrosshairMode.Normal,
        },
        rightPriceScale: {
          borderColor: '#ccc',
        },
        timeScale: {
          borderColor: '#ccc',
          timeVisible: true,
          secondsVisible: false,
        },
      });

      // Add a line series to the chart
      lineSeriesRef.current = chartRef.current.addLineSeries({
        color: '#2962FF',
        lineWidth: 2,
      });

      // Resize chart on container resize
      const handleResize = () => {
        if (chartRef.current && chartContainerRef.current) {
          chartRef.current.applyOptions({ width: chartContainerRef.current.clientWidth });
        }
      };

      window.addEventListener('resize', handleResize);

      return () => {
        window.removeEventListener('resize', handleResize);
        chartRef.current?.remove();
      };
    }
  }, []);

  useEffect(() => {
    if (lineSeriesRef.current && trades.length > 0) {
      // Convert trades to chart data
      const chartData = trades.map(trade => ({
        time: Math.floor(trade.timestamp / 1000), // TradingView uses UNIX timestamps in seconds
        value: trade.price,
      }));

      lineSeriesRef.current.setData(chartData);
    }
  }, [trades]);

  return <div ref={chartContainerRef} />;
};

export default TradingViewChart;

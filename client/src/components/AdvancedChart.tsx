
import React, { useEffect, useRef, memo } from 'react';
import { createChart, IChartApi, CandlestickData } from 'lightweight-charts';

interface Props {
  data: CandlestickData[];
  timeframe?: string;
  onTimeframeChange?: (timeframe: string) => void;
  symbol?: string;
  className?: string;
}

export const AdvancedChart: React.FC<Props> = memo(({
  data,
  timeframe = '1m',
  onTimeframeChange,
  symbol = '',
  className = ''
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  useEffect(() => {
    if (chartContainerRef.current) {
      const chart = createChart(chartContainerRef.current, {
        layout: {
          background: { type: 'solid', color: 'transparent' },
          textColor: '#DDD',
        },
        grid: {
          vertLines: { color: '#2B2B43' },
          horzLines: { color: '#2B2B43' },
        },
        width: chartContainerRef.current.clientWidth,
        height: 400,
      });

      const candlestickSeries = chart.addCandlestickSeries({
        upColor: '#26a69a',
        downColor: '#ef5350',
        borderVisible: false,
        wickUpColor: '#26a69a',
        wickDownColor: '#ef5350',
      });

      candlestickSeries.setData(data);
      chartRef.current = chart;

      const handleResize = () => {
        if (chartContainerRef.current && chartRef.current) {
          chartRef.current.applyOptions({
            width: chartContainerRef.current.clientWidth,
          });
        }
      };

      window.addEventListener('resize', handleResize);

      return () => {
        window.removeEventListener('resize', handleResize);
        if (chartRef.current) {
          chartRef.current.remove();
        }
      };
    }
  }, []);

  useEffect(() => {
    if (chartRef.current && data.length > 0) {
      const candlestickSeries = chartRef.current.addCandlestickSeries();
      candlestickSeries.setData(data);
    }
  }, [data]);

  return (
    <div className={className}>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">{symbol} Price Chart</h3>
        <div className="flex gap-2">
          {['1m', '5m', '15m', '1h'].map((tf) => (
            <button
              key={tf}
              onClick={() => onTimeframeChange?.(tf)}
              className={`px-2 py-1 rounded ${
                timeframe === tf
                  ? 'bg-purple-500 text-white'
                  : 'bg-purple-500/10 hover:bg-purple-500/20'
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>
      <div ref={chartContainerRef} />
    </div>
  );
});

export default AdvancedChart;

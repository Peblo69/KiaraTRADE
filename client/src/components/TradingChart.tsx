import { FC, useState, useEffect, useRef, useMemo } from "react";
import { usePumpPortalStore } from "@/lib/pump-portal-websocket";
import { createChart, IChartApi, Time } from 'lightweight-charts';
import { LineChart } from "lucide-react";

interface Props {
  tokenAddress: string;
}

const INTERVALS = [
  { label: '1s', value: '1' },
  { label: '15s', value: '15' },
  { label: '1m', value: '60' },
  { label: '15m', value: '900' },
  { label: '1h', value: '3600' },
  { label: '4h', value: '14400' }
];

interface CandleData {
  time: Time;
  open: number;
  high: number;
  low: number;
  close: number;
}

const TradingChart: FC<Props> = ({ tokenAddress }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<any>(null);
  const [selectedInterval, setSelectedInterval] = useState('60');

  const token = usePumpPortalStore(state => state.getToken(tokenAddress));

  const { candleData } = useMemo(() => {
    if (!token?.recentTrades?.length) {
      return { candleData: [] };
    }

    const timeframeMs = parseInt(selectedInterval) * 1000;
    const groupedTrades: Record<number, any[]> = {};

    token.recentTrades.forEach(trade => {
      const timestamp = Math.floor(trade.timestamp / timeframeMs) * timeframeMs;
      if (!groupedTrades[timestamp]) {
        groupedTrades[timestamp] = [];
      }
      groupedTrades[timestamp].push(trade);
    });

    const candles: CandleData[] = Object.entries(groupedTrades).map(([time, trades]) => {
      const prices = trades.map(t => t.priceInUsd || 0);
      return {
        time: parseInt(time) / 1000 as Time,
        open: prices[0],
        high: Math.max(...prices),
        low: Math.min(...prices),
        close: prices[prices.length - 1],
      };
    });

    return {
      candleData: candles.sort((a, b) => (a.time as number) - (b.time as number))
    };
  }, [token?.recentTrades, selectedInterval]);

  useEffect(() => {
    if (!chartContainerRef.current || chartRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { color: '#0D0B1F' },
        textColor: '#d1d4dc',
      },
      grid: {
        vertLines: { color: 'rgba(42, 46, 57, 0.2)' },
        horzLines: { color: 'rgba(42, 46, 57, 0.2)' },
      },
      width: chartContainerRef.current.clientWidth,
      height: 500,
      timeScale: {
        timeVisible: true,
        secondsVisible: true,
      },
    });

    const candleSeries = chart.addCandlestickSeries({
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderUpColor: '#26a69a',
      borderDownColor: '#ef5350',
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350',
    });

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;

    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({ 
          width: chartContainerRef.current.clientWidth 
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
      chartRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!candleSeriesRef.current) return;

    candleSeriesRef.current.setData(candleData);

    if (chartRef.current && candleData.length > 0) {
      chartRef.current.timeScale().fitContent();
    }
  }, [candleData]);

  if (!token) return null;

  return (
    <div className="relative bg-[#0D0B1F] rounded-lg p-4 border border-purple-900/30">
      <div className="absolute inset-0 bg-gradient-to-b from-purple-900/10 to-transparent pointer-events-none" />
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <LineChart className="w-5 h-5 text-purple-400" />
          <h2 className="text-purple-100 font-semibold">{token.symbol || 'N/A'} Price Chart</h2>
        </div>
        <div className="flex space-x-2">
          {INTERVALS.map(({ label, value }) => (
            <button
              key={value}
              className={`px-3 py-1 rounded ${
                selectedInterval === value
                  ? 'bg-purple-600 text-white'
                  : 'bg-purple-900/20 text-purple-300 hover:bg-purple-900/40'
              } transition-colors`}
              onClick={() => setSelectedInterval(value)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div ref={chartContainerRef} className="h-[500px] rounded-lg overflow-hidden" />
    </div>
  );
};

export default TradingChart;
import { FC, useState, useEffect, useRef, useMemo } from "react";
import { createChart, IChartApi, CrosshairMode } from 'lightweight-charts';
import { LineChart } from "lucide-react";
import { ChartDataManager, type ChartCandle } from "@/lib/chart-data-manager";
import { useUnifiedToken, useTokenTrades } from "@/lib/unified-token-store";

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

const TradingChart: FC<Props> = ({ tokenAddress }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<any>(null);
  const volumeSeriesRef = useRef<any>(null);
  const dataManagerRef = useRef<ChartDataManager | null>(null);
  const [selectedInterval, setSelectedInterval] = useState('60');

  const token = useUnifiedToken(tokenAddress);
  const trades = useTokenTrades(tokenAddress);

  // Initialize chart and data manager
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
      crosshair: {
        mode: CrosshairMode.Normal,
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

    // Add volume series
    const volumeSeries = chart.addHistogramSeries({
      color: '#385263',
      priceFormat: {
        type: 'volume',
      },
      priceScaleId: '', // Set as an overlay
    });

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;
    volumeSeriesRef.current = volumeSeries;

    // Initialize data manager
    dataManagerRef.current = new ChartDataManager(
      parseInt(selectedInterval),
      (candles) => {
        candleSeries.setData(candles);
        volumeSeries.setData(candles.map(c => ({
          time: c.time,
          value: c.volume || 0,
          color: c.close >= c.open ? '#26a69a50' : '#ef535050'
        })));

        // Fit content after setting data
        chart.timeScale().fitContent();
      }
    );

    // Handle resize
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

  // Handle new trades
  useEffect(() => {
    if (!dataManagerRef.current || !trades?.length) return;

    trades.forEach(trade => {
      dataManagerRef.current?.addTrade({
        timestamp: trade.timestamp,
        priceInUsd: trade.priceInUsd,
        tokenAmount: trade.tokenAmount
      });
    });
  }, [trades]);

  // Handle interval changes
  useEffect(() => {
    if (!dataManagerRef.current || !trades?.length) return;

    dataManagerRef.current.changeInterval(parseInt(selectedInterval));
  }, [selectedInterval, trades]);

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
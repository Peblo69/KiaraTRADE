import React, { useRef, useEffect, useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { LineChart, Settings, Maximize2, ChevronDown } from 'lucide-react';
import { usePumpPortalStore } from '@/lib/pump-portal-websocket';
import { createChart } from 'lightweight-charts';
import type { IChartApi, CandlestickData, Time } from 'lightweight-charts';

interface Props {
  tokenAddress: string;
}

const INTERVALS = [
  { label: '1s', value: '1' },
  { label: '15s', value: '15' },
  { label: '1m', value: '60' },
  { label: '30m', value: '1800' },
  { label: '1h', value: '3600' },
  { label: '1d', value: '86400' }
];

function getTimeframeMs(timeframe: string): number {
  return parseInt(timeframe) * 1000;
}

const TradingChart: React.FC<Props> = ({ tokenAddress }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<any>(null);
  const volumeSeriesRef = useRef<any>(null);
  const [selectedTimeframe, setSelectedTimeframe] = useState('60');

  const token = usePumpPortalStore(state => state.getToken(tokenAddress));

  const { candleData, volumeData } = useMemo(() => {
    if (!token?.recentTrades?.length) {
      return { candleData: [], volumeData: [] };
    }

    const timeframeMs = getTimeframeMs(selectedTimeframe);
    const groupedTrades: Record<number, any[]> = {};

    token.recentTrades.forEach(trade => {
      const timestamp = Math.floor(trade.timestamp / timeframeMs) * timeframeMs;
      if (!groupedTrades[timestamp]) {
        groupedTrades[timestamp] = [];
      }
      groupedTrades[timestamp].push(trade);
    });

    const candles: CandlestickData<Time>[] = [];
    const volumes: any[] = [];

    Object.entries(groupedTrades).forEach(([time, trades]) => {
      const prices = trades.map(t => t.priceInUsd || 0);
      const tokenVolumes = trades.map(t => t.tokenAmount);
      const totalVolume = tokenVolumes.reduce((a, b) => a + b, 0);

      const timestamp = parseInt(time) / 1000;

      candles.push({
        time: timestamp as Time,
        open: prices[0],
        high: Math.max(...prices),
        low: Math.min(...prices),
        close: prices[prices.length - 1],
      });

      volumes.push({
        time: timestamp as Time,
        value: totalVolume,
        color: prices[prices.length - 1] >= prices[0] ? 'rgba(38, 166, 154, 0.5)' : 'rgba(239, 83, 80, 0.5)'
      });
    });

    return {
      candleData: candles.sort((a, b) => (a.time as number) - (b.time as number)),
      volumeData: volumes.sort((a, b) => (a.time as number) - (b.time as number))
    };
  }, [token?.recentTrades, selectedTimeframe]);

  useEffect(() => {
    if (!chartContainerRef.current || chartRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { color: '#0A0A0A' },
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

    const volumeSeries = chart.addHistogramSeries({
      color: '#26a69a',
      priceFormat: { type: 'volume' },
      priceScaleId: '',
    });

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;
    volumeSeriesRef.current = volumeSeries;

    return () => {
      chart.remove();
      chartRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!candleSeriesRef.current || !volumeSeriesRef.current) return;

    requestAnimationFrame(() => {
      candleSeriesRef.current.setData(candleData);
      volumeSeriesRef.current.setData(volumeData);

      if (chartRef.current && candleData.length > 0) {
        chartRef.current.timeScale().fitContent();
      }
    });
  }, [candleData, volumeData]);

  if (!token) return null;

  const currentPrice = token.priceInUsd?.toFixed(8) || '0.00000000';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-white">{token.symbol}</h2>
            <span className="text-sm text-purple-400">${currentPrice}</span>
          </div>
          <p className="text-sm text-gray-400">Real-time market data</p>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex gap-2 bg-[#1A1A1A] p-2 rounded-lg border border-purple-500/10">
            {INTERVALS.map((interval) => (
              <button
                key={interval.value}
                onClick={() => setSelectedTimeframe(interval.value)}
                className={`
                  px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200
                  ${selectedTimeframe === interval.value 
                    ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/20' 
                    : 'text-gray-400 hover:bg-purple-500/20'
                  }
                `}
              >
                {interval.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="hover:bg-purple-500/20">
              <Settings className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="outline" className="hover:bg-purple-500/20">
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div ref={chartContainerRef} className="w-full h-[500px] rounded-lg overflow-hidden" />
    </div>
  );
};

export default TradingChart;
import { FC, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { usePumpPortalStore } from "@/lib/pump-portal-websocket";
import { format } from 'date-fns';
import { createChart, IChartApi } from 'lightweight-charts';

interface TokenChartProps {
  tokenAddress: string;
  onBack: () => void;
}

interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

const INTERVALS = [
  { label: '1s', value: '1s' },
  { label: '5s', value: '5s' },
  { label: '30s', value: '30s' },
  { label: '1m', value: '1m' },
  { label: '15m', value: '15m' },
  { label: '30m', value: '30m' },
  { label: '1h', value: '1h' },
];

const TokenChart: FC<TokenChartProps> = ({ tokenAddress, onBack }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<any>(null);
  const volumeSeriesRef = useRef<any>(null);
  const [timeframe, setTimeframe] = useState('1s');

  // Get store data with useCallback to prevent unnecessary re-renders
  const token = usePumpPortalStore(useCallback(state => state.getToken(tokenAddress), [tokenAddress]));
  const tradeHistory = usePumpPortalStore(useCallback(state => state.tradeHistory[tokenAddress] || [], [tokenAddress]));
  const { currentTime, currentUser } = usePumpPortalStore(useCallback(state => ({
    currentTime: state.currentTime,
    currentUser: state.currentUser
  }), []));

  // Process trade data into candles
  const { candleData, volumeData } = useMemo(() => {
    if (!tradeHistory.length) return { candleData: [], volumeData: [] };

    const timeframeMs = getTimeframeMs(timeframe);
    const groupedTrades: Record<number, any[]> = {};

    // Group trades by timeframe
    tradeHistory.forEach(trade => {
      const timestamp = Math.floor(trade.timestamp / timeframeMs) * timeframeMs;
      if (!groupedTrades[timestamp]) {
        groupedTrades[timestamp] = [];
      }
      groupedTrades[timestamp].push(trade);
    });

    const candles: CandleData[] = [];
    const volumes: any[] = [];

    // Create candle and volume data
    Object.entries(groupedTrades).forEach(([time, trades]) => {
      const prices = trades.map(t => t.priceInUsd);
      const tokenVolumes = trades.map(t => t.tokenAmount || 0);
      const totalVolume = tokenVolumes.reduce((a, b) => a + b, 0);

      const candlePoint = {
        time: parseInt(time) / 1000,
        open: prices[0],
        high: Math.max(...prices),
        low: Math.min(...prices),
        close: prices[prices.length - 1],
        volume: totalVolume
      };

      const volumePoint = {
        time: parseInt(time) / 1000,
        value: totalVolume,
        color: prices[prices.length - 1] >= prices[0] ? 'rgba(38, 166, 154, 0.5)' : 'rgba(239, 83, 80, 0.5)'
      };

      candles.push(candlePoint);
      volumes.push(volumePoint);
    });

    return {
      candleData: candles.sort((a, b) => a.time - b.time),
      volumeData: volumes.sort((a, b) => a.time - b.time)
    };
  }, [tradeHistory, timeframe]);

  // Initialize chart once
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
      height: 400,
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
      priceFormat: {
        type: 'price',
        precision: 8,
        minMove: 0.00000001,
      },
    });

    const volumeSeries = chart.addHistogramSeries({
      color: '#26a69a',
      priceFormat: { type: 'volume' },
      priceScaleId: '',
      scaleMargins: {
        top: 0.8,
        bottom: 0,
      },
    });

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;
    volumeSeriesRef.current = volumeSeries;

    // Cleanup
    return () => {
      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
      volumeSeriesRef.current = null;
    };
  }, []);

  // Update chart data
  useEffect(() => {
    if (!candleSeriesRef.current || !volumeSeriesRef.current) return;

    candleSeriesRef.current.setData(candleData);
    volumeSeriesRef.current.setData(volumeData);

    if (chartRef.current && candleData.length > 0) {
      chartRef.current.timeScale().fitContent();
    }
  }, [candleData, volumeData]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (chartRef.current && chartContainerRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-[1400px] mx-auto">
        <div className="flex items-center justify-between mb-6">
          <Button 
            variant="ghost" 
            onClick={onBack}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div className="flex items-center gap-4">
            <div className="text-sm text-muted-foreground">
              UTC: {currentTime}
            </div>
            <div className="flex gap-2">
              {INTERVALS.map((interval) => (
                <Button
                  key={interval.value}
                  variant={timeframe === interval.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTimeframe(interval.value)}
                  className={timeframe === interval.value ? 'bg-purple-500 text-white' : ''}
                >
                  {interval.label}
                </Button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-4">
          <div className="p-4 rounded-lg border border-purple-500/20 bg-card">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  {token?.symbol} 
                  <span className="text-sm font-normal text-muted-foreground">
                    Price Chart
                  </span>
                </h2>
                <p className="text-sm text-muted-foreground">
                  Current Price: ${token?.price?.toFixed(8) || '0.00000000'}
                </p>
              </div>
              <div className="text-sm text-muted-foreground">
                User: {currentUser}
              </div>
            </div>
            <div ref={chartContainerRef} className="w-full h-[400px]" />
          </div>
        </div>
      </div>
    </div>
  );
};

function getTimeframeMs(timeframe: string): number {
  const value = parseInt(timeframe.slice(0, -1));
  const unit = timeframe.slice(-1);

  switch (unit) {
    case 's': return value * 1000;
    case 'm': return value * 60 * 1000;
    case 'h': return value * 60 * 60 * 1000;
    default: return 1000;
  }
}

export default TokenChart;
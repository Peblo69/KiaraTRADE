import { FC, useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { usePumpPortalStore } from "@/lib/pump-portal-websocket";
import { motion } from "framer-motion";
import TokenStats from "./TokenStats";
import TradeHistory from "../../../TradingView/project/src/components/TradeHistory";
import { createChart, IChartApi } from 'lightweight-charts';

interface TokenChartProps {
  tokenAddress: string;
  onBack: () => void;
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

const TokenChart: FC<TokenChartProps> = ({ tokenAddress, onBack }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [timeframe, setTimeframe] = useState('1s');
  const token = usePumpPortalStore(state => state.getToken(tokenAddress));

  useEffect(() => {
    if (!chartContainerRef.current) return;

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

    if (token?.recentTrades?.length) {
      const timeframeMs = getTimeframeMs(timeframe);
      const groupedTrades: Record<number, any[]> = {};

      token.recentTrades.forEach(trade => {
        const timestamp = Math.floor(trade.timestamp / timeframeMs) * timeframeMs;
        if (!groupedTrades[timestamp]) {
          groupedTrades[timestamp] = [];
        }
        groupedTrades[timestamp].push(trade);
      });

      const candleData = Object.entries(groupedTrades).map(([time, trades]) => {
        const prices = trades.map(t => t.priceInUsd);
        const volumes = trades.map(t => t.tokenAmount);
        const totalVolume = volumes.reduce((a, b) => a + b, 0);

        return {
          time: parseInt(time) / 1000,
          open: prices[0],
          high: Math.max(...prices),
          low: Math.min(...prices),
          close: prices[prices.length - 1],
          value: totalVolume,
          color: prices[prices.length - 1] >= prices[0] ? 'rgba(38, 166, 154, 0.5)' : 'rgba(239, 83, 80, 0.5)'
        };
      }).sort((a, b) => a.time - b.time);

      candleSeries.setData(candleData);
      volumeSeries.setData(candleData);
      chart.timeScale().fitContent();
    }

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [token?.recentTrades, timeframe]);

  if (!token) {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="min-h-screen bg-[#0A0A0A] text-gray-100"
      >
        <div className="max-w-[1400px] mx-auto p-4">
          <Button variant="ghost" onClick={onBack} className="mb-6 gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div className="p-4 rounded-lg border border-red-500/20 bg-red-500/10">
            <p className="text-red-400">Token not found</p>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-[#0A0A0A] text-gray-100"
    >
      <div className="max-w-[1400px] mx-auto p-6">
        {/* Header */}
        <motion.div 
          initial={{ y: -20 }}
          animate={{ y: 0 }}
          className="flex items-center justify-between mb-8 bg-[#111111] p-4 rounded-xl border border-purple-500/20"
        >
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={onBack}
              className="hover:bg-purple-500/20 transition-all duration-300"
            >
              <ArrowLeft className="h-5 w-5 text-purple-400" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
                {token.symbol}
              </h1>
              <p className="text-sm text-gray-400">
                ${token.priceInUsd?.toFixed(8) || '0.00000000'}
              </p>
            </div>
          </div>

          <div className="flex gap-2 bg-[#1A1A1A] p-2 rounded-lg border border-purple-500/10">
            {INTERVALS.map((interval) => (
              <motion.button
                key={interval.value}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setTimeframe(interval.value)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200
                  ${timeframe === interval.value 
                    ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/20' 
                    : 'text-gray-400 hover:bg-purple-500/20'
                  }`}
              >
                {interval.label}
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* Content Grid */}
        <div className="grid grid-cols-[1fr_350px] gap-6">
          {/* Chart Section */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <TokenStats tokenAddress={tokenAddress} />

            <div className="bg-[#111111] rounded-xl border border-purple-500/20 p-6 hover:border-purple-500/40 transition-all duration-300">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-semibold text-gray-200">Price Chart</h2>
                  <p className="text-sm text-gray-400">Real-time market data</p>
                </div>
              </div>

              <div 
                ref={chartContainerRef} 
                className="w-full h-[500px] rounded-lg overflow-hidden"
              />
            </div>
          </motion.div>

          {/* Right Sidebar */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            {/* Trade History Card */}
            <div className="bg-[#111111] rounded-xl border border-purple-500/20 p-6 hover:border-purple-500/40 transition-all duration-300 h-[calc(100vh-160px)]">
              <TradeHistory tokenAddress={tokenAddress} />
            </div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
};

export default TokenChart;
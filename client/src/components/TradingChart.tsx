import React, { useEffect, useRef } from 'react';
import { LineChart } from 'lucide-react';
import { usePumpPortalStore } from '@/lib/pump-portal-websocket';
import { createChart, IChartApi, CandlestickSeriesOptions, ColorType } from 'lightweight-charts';

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
  timeframe = '1m'
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  // Get data from store
  const token = usePumpPortalStore(state => state.getToken(tokenAddress));
  const trades = token?.recentTrades || [];

  useEffect(() => {
    if (!containerRef.current) return;

    // Create chart with recommended settings
    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#161b2b' },
        textColor: '#d1d4dc',
      },
      grid: {
        vertLines: { color: 'rgba(42, 46, 57, 0.2)' },
        horzLines: { color: 'rgba(42, 46, 57, 0.2)' },
      },
      width: containerRef.current.clientWidth,
      height: 500,
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        tickMarkFormatter: (time: number) => {
          const date = new Date(time * 1000);
          return date.toLocaleTimeString();
        },
      },
      rightPriceScale: {
        borderColor: '#485c7b',
        scaleMargins: {
          top: 0.1,
          bottom: 0.2,
        },
      },
      crosshair: {
        vertLine: {
          color: '#758696',
          width: 1,
          labelBackgroundColor: '#161b2b',
        },
        horzLine: {
          color: '#758696',
          width: 1,
          labelBackgroundColor: '#161b2b',
        },
      },
    });

    // Add candlestick series
    const candlestickSeries = chart.addCandlestickSeries({
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderVisible: false,
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350',
    });

    // Add volume histogram
    const volumeSeries = chart.addHistogramSeries({
      color: '#385263',
      priceFormat: {
        type: 'volume',
      },
      priceScaleId: '', // Set to empty to overlay on the main chart
      scaleMargins: {
        top: 0.8, // Place volume at the bottom 20% of the chart
        bottom: 0,
      },
    });

    // Process data or trades
    const processedData = data.length > 0 ? data : processTradesIntoCandles(trades);

    if (processedData.length > 0) {
      candlestickSeries.setData(processedData);
      volumeSeries.setData(processedData);
      chart.timeScale().fitContent();
    }

    // Handle resize events
    const handleResize = () => {
      if (containerRef.current) {
        chart.applyOptions({
          width: containerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener('resize', handleResize);

    // Store cleanup function
    cleanupRef.current = () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };

    // Store chart reference
    chartRef.current = chart;

    return () => cleanupRef.current?.();
  }, [tokenAddress, trades.length, data]);

  // Helper function to process trades into OHLCV candles
  const processTradesIntoCandles = (trades: any[]) => {
    const ohlcvMap = new Map();
    const minuteInMs = 60000; // 1 minute in milliseconds

    trades.forEach(trade => {
      const timestamp = Math.floor(trade.timestamp / minuteInMs) * minuteInMs;
      const price = trade.priceInUsd;
      const volume = trade.tokenAmount;

      if (!ohlcvMap.has(timestamp)) {
        ohlcvMap.set(timestamp, {
          time: timestamp / 1000, // Convert to seconds for the chart
          open: price,
          high: price,
          low: price,
          close: price,
          volume: volume,
        });
      } else {
        const candle = ohlcvMap.get(timestamp);
        candle.high = Math.max(candle.high, price);
        candle.low = Math.min(candle.low, price);
        candle.close = price;
        candle.volume += volume;
      }
    });

    return Array.from(ohlcvMap.values())
      .sort((a, b) => a.time - b.time);
  };

  return (
    <div className="w-full h-full bg-[#161b2b] rounded-lg overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-purple-900/30">
        <div className="flex items-center space-x-2">
          <LineChart className="w-5 h-5 text-purple-400" />
          <h2 className="text-purple-100 font-semibold">
            {token?.symbol || tokenAddress.slice(0, 6)}... Price Chart
          </h2>
        </div>
      </div>
      <div 
        ref={containerRef}
        className="w-full h-[500px]"
      />
    </div>
  );
};

export default TradingChart;
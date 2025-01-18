import { FC, useEffect, useRef, useMemo, useCallback, useState } from 'react';
import { createChart, type IChartApi, type ISeriesApi, type CandlestickSeriesPartialOptions, type HistogramSeriesPartialOptions } from 'lightweight-charts';
import { Card } from '@/components/ui/card';
import { useTokenPriceStore, TIMEFRAMES } from '@/lib/price-history';
import { Button } from '@/components/ui/button';

interface TokenChartProps {
  tokenAddress: string;
  height?: number;
}

type TimeframeKey = keyof typeof TIMEFRAMES;

const TokenChart: FC<TokenChartProps> = ({ 
  tokenAddress,
  height = 400
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const [selectedTimeframe, setSelectedTimeframe] = useState<TimeframeKey>('5m');

  // Get price history data
  const priceHistory = useTokenPriceStore(state => 
    state.getPriceHistory(tokenAddress, selectedTimeframe)
  );

  // Memoize chart data transformation
  const chartData = useMemo(() => {
    if (!priceHistory.length) return [];

    return priceHistory.map(candle => ({
      time: candle.timestamp / 1000,
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
      volume: candle.volume
    }));
  }, [priceHistory]);

  // Initialize chart once
  useEffect(() => {
    if (!containerRef.current || chartRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: 'solid', color: 'transparent' },
        textColor: '#D9D9D9',
      },
      grid: {
        vertLines: { color: 'rgba(42, 46, 57, 0.3)' },
        horzLines: { color: 'rgba(42, 46, 57, 0.3)' },
      },
      crosshair: {
        mode: 1,
      },
      rightPriceScale: {
        borderColor: 'rgba(197, 203, 206, 0.8)',
      },
      timeScale: {
        borderColor: 'rgba(197, 203, 206, 0.8)',
        timeVisible: true,
        secondsVisible: false,
      },
      width: containerRef.current.clientWidth,
      height
    });

    const candlestickSeries = chart.addCandlestickSeries({
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderVisible: false,
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350',
    });

    const volumeSeries = chart.addHistogramSeries({
      color: '#26a69a',
      priceFormat: {
        type: 'volume',
      },
      overlay: true,
      priceScaleId: '',
      scaleMargins: {
        top: 0.8,
        bottom: 0,
      },
    } as HistogramSeriesPartialOptions);

    chartRef.current = chart;
    candlestickSeriesRef.current = candlestickSeries;
    volumeSeriesRef.current = volumeSeries;

    return () => {
      chart.remove();
      chartRef.current = null;
      candlestickSeriesRef.current = null;
      volumeSeriesRef.current = null;
    };
  }, []); // Empty dependency array for one-time initialization

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current && chartRef.current) {
        chartRef.current.applyOptions({ 
          width: containerRef.current.clientWidth 
        });
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Update data only when chartData changes
  useEffect(() => {
    if (!candlestickSeriesRef.current || !volumeSeriesRef.current || !chartRef.current || !chartData.length) {
      return;
    }

    // Update price data
    candlestickSeriesRef.current.setData(chartData);

    // Update volume data
    const volumeData = chartData.map(d => ({
      time: d.time,
      value: d.volume,
      color: d.close >= d.open ? '#26a69a' : '#ef5350'
    }));

    volumeSeriesRef.current.setData(volumeData);
    chartRef.current.timeScale().fitContent();
  }, [chartData]); // Only depend on chartData

  // Memoize timeframe change handler
  const handleTimeframeChange = useCallback((tf: TimeframeKey) => {
    setSelectedTimeframe(tf);
  }, []);

  return (
    <Card className="p-4 bg-black/40 backdrop-blur-lg border border-gray-800">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-white">Price Chart</h3>
        <div className="flex gap-2">
          {(Object.keys(TIMEFRAMES) as TimeframeKey[]).map((tf) => (
            <Button
              key={tf}
              variant={selectedTimeframe === tf ? "default" : "outline"}
              size="sm"
              onClick={() => handleTimeframeChange(tf)}
            >
              {tf}
            </Button>
          ))}
        </div>
      </div>
      <div ref={containerRef} />
    </Card>
  );
};

export default TokenChart;
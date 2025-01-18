import { FC, useEffect, useRef, useMemo, useCallback, useState } from 'react';
import { createChart, IChartApi, ISeriesApi } from 'lightweight-charts';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useTokenPriceStore, TIMEFRAMES, type TimeframeKey } from '@/lib/price-history';

interface TokenChartProps {
  tokenAddress: string;
  height?: number;
}

const TokenChart: FC<TokenChartProps> = ({ 
  tokenAddress,
  height = 400
}) => {
  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<{
    candlestick: ISeriesApi<"Candlestick"> | null;
    volume: ISeriesApi<"Histogram"> | null;
  }>({ candlestick: null, volume: null });

  // Timeframe state
  const [selectedTimeframe, setSelectedTimeframe] = useState<TimeframeKey>('5m');

  // Memoized selector
  const getPriceHistory = useCallback(
    (state: any) => state.getPriceHistory(tokenAddress, selectedTimeframe),
    [tokenAddress, selectedTimeframe]
  );

  // Get price history data
  const priceHistory = useTokenPriceStore(getPriceHistory);

  // Transform chart data
  const chartData = useMemo(() => {
    if (!priceHistory?.length) return null;

    return {
      candles: priceHistory.map(candle => ({
        time: Math.floor(candle.timestamp / 1000),
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close
      })),
      volumes: priceHistory.map(candle => ({
        time: Math.floor(candle.timestamp / 1000),
        value: candle.volume,
        color: candle.close >= candle.open ? '#26a69a' : '#ef5350'
      }))
    };
  }, [priceHistory]);

  // Chart initialization
  useEffect(() => {
    if (!containerRef.current) return;

    // Create chart instance
    if (!chartRef.current) {
      const chart = createChart(containerRef.current, {
        layout: {
          background: { color: 'transparent' },
          textColor: '#D9D9D9',
        },
        grid: {
          vertLines: { color: 'rgba(42, 46, 57, 0.3)' },
          horzLines: { color: 'rgba(42, 46, 57, 0.3)' },
        },
        width: containerRef.current.clientWidth,
        height,
        timeScale: {
          timeVisible: true,
          secondsVisible: false,
        }
      });

      chartRef.current = chart;

      // Create series
      seriesRef.current.candlestick = chart.addCandlestickSeries({
        upColor: '#26a69a',
        downColor: '#ef5350',
        borderVisible: false,
        wickUpColor: '#26a69a',
        wickDownColor: '#ef5350',
      });

      seriesRef.current.volume = chart.addHistogramSeries({
        color: '#26a69a',
        priceFormat: { type: 'volume' },
        priceScaleId: '',
        scaleMargins: {
          top: 0.8,
          bottom: 0,
        },
      });

      // Handle resize
      const handleResize = () => {
        if (chartRef.current && containerRef.current) {
          chartRef.current.applyOptions({ 
            width: containerRef.current.clientWidth 
          });
        }
      };

      window.addEventListener('resize', handleResize);

      return () => {
        window.removeEventListener('resize', handleResize);
        chart.remove();
        chartRef.current = null;
        seriesRef.current = { candlestick: null, volume: null };
      };
    }
  }, [height]);

  // Update data
  useEffect(() => {
    if (!chartRef.current || !chartData || !seriesRef.current.candlestick || !seriesRef.current.volume) return;

    seriesRef.current.candlestick.setData(chartData.candles);
    seriesRef.current.volume.setData(chartData.volumes);
    chartRef.current.timeScale().fitContent();
  }, [chartData]);

  // Memoized handler
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
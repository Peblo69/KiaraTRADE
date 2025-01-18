import { FC, useEffect, useRef, useMemo, useCallback, useState } from 'react';
import { createChart } from 'lightweight-charts';
import { Card } from '@/components/ui/card';
import { useTokenPriceStore, TIMEFRAMES } from '@/lib/price-history';
import { Button } from '@/components/ui/button';

type TimeframeKey = keyof typeof TIMEFRAMES;

interface TokenChartProps {
  tokenAddress: string;
  height?: number;
}

const TokenChart: FC<TokenChartProps> = ({ 
  tokenAddress,
  height = 400
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedTimeframe, setSelectedTimeframe] = useState<TimeframeKey>('5m');

  // Create stable refs for chart instances
  const chartRef = useRef<any>(null);
  const seriesRef = useRef<{
    candlestick: any;
    volume: any;
  }>({ candlestick: null, volume: null });

  // Get price history with memoized selector
  const priceHistory = useTokenPriceStore(
    useCallback(state => state.getPriceHistory(tokenAddress, selectedTimeframe), 
    [tokenAddress, selectedTimeframe])
  );

  // Transform data once when priceHistory changes
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

  // Initialize chart once
  useEffect(() => {
    if (!containerRef.current || chartRef.current) return;

    chartRef.current = createChart(containerRef.current, {
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

    seriesRef.current.candlestick = chartRef.current.addCandlestickSeries({
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderVisible: false,
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350',
    });

    seriesRef.current.volume = chartRef.current.addHistogramSeries({
      color: '#26a69a',
      priceFormat: { type: 'volume' },
      priceScaleId: '',
      scaleMargins: {
        top: 0.8,
        bottom: 0,
      },
    });

    return () => {
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
        seriesRef.current = { candlestick: null, volume: null };
      }
    };
  }, []); // Empty deps for one-time initialization

  // Handle resize
  useEffect(() => {
    if (!containerRef.current || !chartRef.current) return;

    const handleResize = () => {
      chartRef.current.applyOptions({ 
        width: containerRef.current!.clientWidth 
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Update data only when chartData changes
  useEffect(() => {
    if (!chartRef.current || !chartData) return;

    const { candlestick, volume } = seriesRef.current;
    if (!candlestick || !volume) return;

    candlestick.setData(chartData.candles);
    volume.setData(chartData.volumes);
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
import { FC, useEffect, useRef, useMemo, useCallback } from 'react';
import { createChart, IChartApi, ISeriesApi } from 'lightweight-charts';
import { Card } from '@/components/ui/card';
import { useTokenPriceStore } from '@/lib/price-history';

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

  // Get price history with memoized selector
  const priceHistory = useTokenPriceStore(useCallback(
    state => state.getPriceHistory(tokenAddress),
    [tokenAddress]
  ));

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
    if (!containerRef.current || chartRef.current) return;

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
  }, [height]);

  // Update data
  useEffect(() => {
    if (!chartRef.current || !chartData || !seriesRef.current.candlestick || !seriesRef.current.volume) return;

    seriesRef.current.candlestick.setData(chartData.candles);
    seriesRef.current.volume.setData(chartData.volumes);
    chartRef.current.timeScale().fitContent();
  }, [chartData]);

  return (
    <Card className="p-4 bg-black/40 backdrop-blur-lg border border-gray-800">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-white">Price Chart</h3>
      </div>
      <div ref={containerRef} />
    </Card>
  );
};

export default TokenChart;
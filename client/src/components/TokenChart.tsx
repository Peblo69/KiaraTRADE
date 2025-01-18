import { FC, useEffect, useRef, useMemo, useCallback, useState } from 'react';
import { createChart } from 'lightweight-charts';
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
  const [selectedTimeframe, setSelectedTimeframe] = useState<TimeframeKey>('5m');
  
  // Create stable refs for chart instances
  const chart = useRef<any>(null);
  const candlestickSeries = useRef<any>(null);
  const volumeSeries = useRef<any>(null);

  // Get price history data
  const priceHistory = useTokenPriceStore(useCallback((state) => 
    state.getPriceHistory(tokenAddress, selectedTimeframe)
  , [tokenAddress, selectedTimeframe]));

  // Transform price history data
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

  // Initialize chart
  useEffect(() => {
    if (!containerRef.current || chart.current) return;

    chart.current = createChart(containerRef.current, {
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

    candlestickSeries.current = chart.current.addCandlestickSeries({
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderVisible: false,
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350',
    });

    volumeSeries.current = chart.current.addHistogramSeries({
      color: '#26a69a',
      priceFormat: { type: 'volume' },
      priceScaleId: '',
      scaleMargins: {
        top: 0.8,
        bottom: 0,
      },
    });

    return () => {
      if (chart.current) {
        chart.current.remove();
        chart.current = null;
        candlestickSeries.current = null;
        volumeSeries.current = null;
      }
    };
  }, []); // Empty deps for one-time initialization

  // Handle resize
  useEffect(() => {
    if (!containerRef.current || !chart.current) return;

    const handleResize = () => {
      chart.current.applyOptions({ 
        width: containerRef.current!.clientWidth 
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Update data when chartData changes
  useEffect(() => {
    if (!chart.current || !candlestickSeries.current || !volumeSeries.current || !chartData) {
      return;
    }

    candlestickSeries.current.setData(chartData.candles);
    volumeSeries.current.setData(chartData.volumes);
    chart.current.timeScale().fitContent();
  }, [chartData]);

  const handleTimeframeChange = useCallback((tf: TimeframeKey) => {
    setSelectedTimeframe(tf);
  }, []);

  return (
    <Card className="p-4 bg-black/40 backdrop-blur-lg border border-gray-800">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-white">Price Chart</h3>
        <div className="flex gap-2">
          {Object.keys(TIMEFRAMES).map((tf) => (
            <Button
              key={tf}
              variant={selectedTimeframe === tf ? "default" : "outline"}
              size="sm"
              onClick={() => handleTimeframeChange(tf as TimeframeKey)}
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

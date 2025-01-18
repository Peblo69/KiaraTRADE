import { FC, useEffect, useRef, useMemo, useCallback, useState } from 'react';
import { createChart } from 'lightweight-charts';
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
  // Refs for chart elements
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);
  const candlestickRef = useRef<any>(null);
  const volumeRef = useRef<any>(null);

  // Local state for timeframe selection
  const [selectedTimeframe, setSelectedTimeframe] = useState<TimeframeKey>('5m');

  // Get price history with memoized selector
  const priceHistory = useTokenPriceStore(useCallback(
    state => state.getPriceHistory(tokenAddress, selectedTimeframe),
    [tokenAddress, selectedTimeframe]
  ));

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

  // Combined chart initialization and updates
  useEffect(() => {
    if (!containerRef.current) return;

    // Create chart if it doesn't exist
    if (!chartRef.current) {
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

      candlestickRef.current = chartRef.current.addCandlestickSeries({
        upColor: '#26a69a',
        downColor: '#ef5350',
        borderVisible: false,
        wickUpColor: '#26a69a',
        wickDownColor: '#ef5350',
      });

      volumeRef.current = chartRef.current.addHistogramSeries({
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
        if (chartRef.current) {
          chartRef.current.remove();
          chartRef.current = null;
          candlestickRef.current = null;
          volumeRef.current = null;
        }
      };
    }

    // Update data if available
    if (chartData && candlestickRef.current && volumeRef.current) {
      candlestickRef.current.setData(chartData.candles);
      volumeRef.current.setData(chartData.volumes);
      chartRef.current.timeScale().fitContent();
    }
  }, [chartData, height]); // Only re-run if data or height changes

  // Memoized timeframe change handler
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
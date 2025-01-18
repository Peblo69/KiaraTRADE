import { FC, useEffect, useRef } from 'react';
import { createChart, ColorType, IChartApi, ISeriesApi } from 'lightweight-charts';
import { Card } from '@/components/ui/card';
import { useTokenPriceStore, TIMEFRAMES } from '@/lib/price-history';
import { usePumpPortalStore } from '@/lib/pump-portal-websocket';

interface TokenChartProps {
  tokenAddress: string;
  height?: number;
}

const TokenChart: FC<TokenChartProps> = ({ tokenAddress, height = 400 }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chart = useRef<IChartApi | null>(null);
  const candlestickSeries = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeSeries = useRef<ISeriesApi<"Histogram"> | null>(null);

  // Get initial price data from the store
  const priceHistory = useTokenPriceStore(state => 
    state.getPriceHistory(tokenAddress, '5m')
  );

  // Subscribe to token updates
  const token = usePumpPortalStore(state => 
    state.tokens.find(t => t.address === tokenAddress)
  );

  useEffect(() => {
    if (!chartContainerRef.current || !tokenAddress) return;

    // Initialize chart
    chart.current = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: 'rgba(255, 255, 255, 0.5)',
      },
      grid: {
        vertLines: { color: 'rgba(255, 255, 255, 0.05)' },
        horzLines: { color: 'rgba(255, 255, 255, 0.05)' },
      },
      crosshair: {
        mode: 0,
        vertLine: {
          width: 1,
          color: 'rgba(255, 255, 255, 0.1)',
          style: 3,
        },
        horzLine: {
          width: 1,
          color: 'rgba(255, 255, 255, 0.1)',
          style: 3,
        },
      },
      rightPriceScale: {
        borderColor: 'rgba(255, 255, 255, 0.1)',
      },
      timeScale: {
        borderColor: 'rgba(255, 255, 255, 0.1)',
        timeVisible: true,
        secondsVisible: false,
      },
    });

    // Add candlestick series
    candlestickSeries.current = chart.current.addCandlestickSeries({
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderVisible: false,
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350',
    });

    // Add volume series
    volumeSeries.current = chart.current.addHistogramSeries({
      color: '#26a69a',
      priceFormat: {
        type: 'volume',
      },
      priceScaleId: 'volume',
    });

    chart.current.priceScale('volume').applyOptions({
      scaleMargins: {
        top: 0.8,
        bottom: 0,
      },
    });

    // Set initial data
    if (priceHistory.length > 0) {
      candlestickSeries.current.setData(
        priceHistory.map(candle => ({
          time: candle.timestamp / 1000,
          open: candle.open,
          high: candle.high,
          low: candle.low,
          close: candle.close
        }))
      );

      volumeSeries.current.setData(
        priceHistory.map(candle => ({
          time: candle.timestamp / 1000,
          value: candle.volume,
          color: candle.close >= candle.open ? 
            'rgba(38, 166, 154, 0.5)' : 
            'rgba(239, 83, 80, 0.5)'
        }))
      );

      // Set visible range to last hour
      const lastTimestamp = priceHistory[priceHistory.length - 1].timestamp / 1000;
      chart.current.timeScale().setVisibleRange({
        from: lastTimestamp - 3600, // 1 hour ago
        to: lastTimestamp
      });
    }

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current && chart.current) {
        chart.current.applyOptions({ 
          width: chartContainerRef.current.clientWidth 
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (chart.current) {
        chart.current.remove();
      }
    };
  }, [height, tokenAddress, priceHistory]);

  // Update chart when new price data comes in
  useEffect(() => {
    if (!token || !candlestickSeries.current || !volumeSeries.current) return;

    const lastCandle = priceHistory[priceHistory.length - 1];
    if (!lastCandle) return;

    // Update latest candle
    candlestickSeries.current.update({
      time: lastCandle.timestamp / 1000,
      open: lastCandle.open,
      high: lastCandle.high,
      low: lastCandle.low,
      close: lastCandle.close
    });

    volumeSeries.current.update({
      time: lastCandle.timestamp / 1000,
      value: lastCandle.volume,
      color: lastCandle.close >= lastCandle.open ? 
        'rgba(38, 166, 154, 0.5)' : 
        'rgba(239, 83, 80, 0.5)'
    });

  }, [token, priceHistory]);

  const currentPrice = token?.price ? `$${token.price.toFixed(6)}` : 'Loading...';
  const priceChange = token?.priceChange24h ? `${token.priceChange24h.toFixed(2)}%` : '';
  const priceColor = token?.priceChange24h && token.priceChange24h >= 0 ? 
    'text-green-500' : 'text-red-500';

  return (
    <Card className="p-4 bg-black/40 backdrop-blur-lg border border-gray-800">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-white">Price Chart</h3>
        <div className="flex items-center gap-2">
          <span className="text-lg text-white">{currentPrice}</span>
          {priceChange && (
            <span className={`text-sm ${priceColor}`}>
              {priceChange}
            </span>
          )}
        </div>
      </div>
      <div ref={chartContainerRef} />
    </Card>
  );
};

export default TokenChart;
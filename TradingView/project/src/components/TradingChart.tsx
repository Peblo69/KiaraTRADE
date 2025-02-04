import React, { useEffect, useRef, useState } from 'react';
import { usePumpPortalStore } from '@/lib/pump-portal-websocket';
import { createChart, IChartApi, ISeriesApi, UTCTimestamp } from 'lightweight-charts';
import { calculatePumpFunTokenMetrics } from '@/utils/token-calculations';

const CANDLE_DURATION = 5000; // 5 seconds

interface TradingChartProps {
  tokenAddress?: string;
}

const TradingChart: React.FC<TradingChartProps> = ({ tokenAddress }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  const seriesRef = useRef<{
    candles: ISeriesApi<"Candlestick"> | null;
    volume: ISeriesApi<"Histogram"> | null;
  }>({ candles: null, volume: null });

  // Track the “current candle” for the ongoing 5-second window
  const currentCandleRef = useRef<{
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  } | null>(null);

  // Toggle between ‘price’ and ‘mcap’
  const [displayMode, setDisplayMode] = useState<'price' | 'mcap'>('mcap');

  const token = usePumpPortalStore(state => tokenAddress ? state.getToken(tokenAddress) : null);
  const solPrice = usePumpPortalStore(state => state.solPrice);

  // Track whether we should auto-scroll to the newest candle
  const [isAutoScroll, setIsAutoScroll] = useState(true);

  // --- Helper to format scale (you can tweak logic as needed)
  const getScaleFormatter = (price: number) => {
    // If user toggles MCap, round more coarsely
    if (displayMode === 'mcap') {
      if (price >= 10000) return `$${Math.round(price / 1000) * 1000}`;
      return `$${Math.round(price / 200) * 200}`;
    }
    // If user toggles Price, show more decimals
    return `$${price.toFixed(10)}`;
  };

  // --- Process an entire trades array into 5-second candles
  const processTradeData = (trades: TokenTrade[]) => {
    if (!trades || trades.length === 0) return [];

    const timeframes = new Map<number, {
      time: number;
      open: number;
      high: number;
      low: number;
      close: number;
      volume: number;
    }>();

    const sortedTrades = [...trades].sort((a, b) => a.timestamp - b.timestamp);

    for (const trade of sortedTrades) {
      // Candle timestamp for the trade
      const timestamp = Math.floor(trade.timestamp / CANDLE_DURATION) * CANDLE_DURATION;

      const metrics = calculatePumpFunTokenMetrics({
        vSolInBondingCurve: trade.vSolInBondingCurve,
        vTokensInBondingCurve: trade.vTokensInBondingCurve,
        solPrice
      });
      const value = displayMode === 'price' ? metrics.price.usd : metrics.marketCap.usd;

      if (!timeframes.has(timestamp)) {
        timeframes.set(timestamp, {
          time: timestamp,
          open: value,
          high: value,
          low: value,
          close: value,
          volume: trade.tokenAmount,
        });
      } else {
        const candle = timeframes.get(timestamp)!;
        candle.high = Math.max(candle.high, value);
        candle.low = Math.min(candle.low, value);
        candle.close = value;
        candle.volume += trade.tokenAmount;
      }
    }

    // Convert to array and sort by time
    return Array.from(timeframes.values())
      .sort((a, b) => a.time - b.time)
      .map(candle => ({
        time: (candle.time / 1000) as UTCTimestamp,
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
        volume: candle.volume,
      }));
  };

  // --- Update the “current” candle in real-time as new trades arrive
  const updateCurrentCandle = (trade: TokenTrade) => {
    if (!seriesRef.current.candles || !chartRef.current) return;

    // If 5 seconds have passed (or new candle timeframe), create a new candle
    const currentTime = Date.now();
    const candleTimestamp = Math.floor(currentTime / CANDLE_DURATION) * CANDLE_DURATION;

    const metrics = calculatePumpFunTokenMetrics({
      vSolInBondingCurve: trade.vSolInBondingCurve,
      vTokensInBondingCurve: trade.vTokensInBondingCurve,
      solPrice
    });
    const value = (displayMode === 'price')
      ? metrics.price.usd
      : metrics.marketCap.usd;

    // If we have no current candle or the time has advanced to a new 5s window:
    if (
      !currentCandleRef.current ||
      currentCandleRef.current.time !== candleTimestamp
    ) {
      currentCandleRef.current = {
        time: candleTimestamp,
        open: value,
        high: value,
        low: value,
        close: value,
        volume: trade.tokenAmount,
      };
    } else {
      // We’re in the same 5-second window => update OHLC
      const candle = currentCandleRef.current;
      candle.high = Math.max(candle.high, value);
      candle.low = Math.min(candle.low, value);
      candle.close = value;
      candle.volume += trade.tokenAmount;
    }

    // Actually update the candle in the series
    try {
      seriesRef.current.candles.update({
        time: (candleTimestamp / 1000) as UTCTimestamp,
        open: currentCandleRef.current.open,
        high: currentCandleRef.current.high,
        low: currentCandleRef.current.low,
        close: currentCandleRef.current.close,
      });

      // Update the volume series
      seriesRef.current.volume?.update({
        time: (candleTimestamp / 1000) as UTCTimestamp,
        value: currentCandleRef.current.volume,
        color:
          currentCandleRef.current.close >= currentCandleRef.current.open
            ? '#26a69a80'
            : '#ef535080',
      });

      // If we’re in auto-scroll mode, scroll the chart to the newest data
      if (isAutoScroll) {
        chartRef.current.timeScale().scrollToRealTime();
      }
    } catch (error) {
      console.warn('Failed to update candle:', error);
    }
  };

  // --- Reprocess the entire trades list into candles and set to series
  const updateChart = () => {
    if (!token?.recentTrades || !seriesRef.current.candles) return;

    try {
      const candleData = processTradeData(token.recentTrades);

      if (candleData.length > 0) {
        seriesRef.current.candles.setData(candleData);

        const volumeData = candleData.map(candle => ({
          time: candle.time,
          value: candle.volume,
          color: candle.close >= candle.open ? '#26a69a80' : '#ef535080',
        }));
        seriesRef.current.volume?.setData(volumeData);

        // If we’re auto-scrolling, go to the right edge
        if (isAutoScroll) {
          chartRef.current?.timeScale().scrollToRealTime();
        }
      }
    } catch (error) {
      console.warn('Failed to update chart:', error);
    }
  };

  // --- Initialize the chart and candle/volume series
  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: 'solid', color: '#0D0B1F' },
        textColor: '#d1d4dc',
      },
      grid: {
        vertLines: { color: 'rgba(139, 92, 246, 0.1)' },
        horzLines: { color: 'rgba(139, 92, 246, 0.1)' },
      },
      width: containerRef.current.clientWidth,
      height: 600,

      // Keep it manual, as you requested
      rightPriceScale: {
        visible: true,
        borderVisible: false,
        autoScale: false, // manual vertical scale
        scaleMargins: {
          top: 0.1,
          bottom: 0.2,
        },
        mode: 0,
        entireTextOnly: true,
        ticksVisible: true,
        dragEnabled: true,
        borderColor: 'rgba(139, 92, 246, 0.1)',
        formatPrice: getScaleFormatter,
      },

      timeScale: {
        timeVisible: true,
        secondsVisible: true,
        rightOffset: 10, // Add some space on the right
        barSpacing: 10,  // You can tweak bar spacing
        fixLeftEdge: false,
        fixRightEdge: false,
        borderVisible: true,
        borderColor: 'rgba(139, 92, 246, 0.1)',
        visible: true,
        lockVisibleTimeRangeOnResize: false,
      },

      // We allow manual scroll/scale
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: true,
      },
      handleScale: {
        axisPressedMouseMove: {
          time: true,
          price: true,
        },
        mouseWheel: true,
        pinch: true,
      },

      crosshair: {
        mode: 1,
        vertLine: {
          width: 1,
          color: 'rgba(139, 92, 246, 0.3)',
          style: 2,
        },
        horzLine: {
          width: 1,
          color: 'rgba(139, 92, 246, 0.3)',
          style: 2,
        },
      },

      // Enable kinetic scrolling
      kineticScroll: {
        mouse: true,
        touch: true,
      },
    });

    // Candlestick series for Price/MCap
    const candleSeries = chart.addCandlestickSeries({
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderVisible: false,
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350',
      priceFormat: {
        type: 'price',
        // If 'price', you can have up to 10 decimals, etc.
        precision: displayMode === 'price' ? 10 : 2,
        minMove: displayMode === 'price' ? 0.0000000001 : 1,
      },
    });

    // Volume histogram
    const volumeSeries = chart.addHistogramSeries({
      priceFormat: {
        type: 'volume',
      },
      priceScaleId: '',
      scaleMargins: {
        top: 0.8,
        bottom: 0,
      },
    });

    chartRef.current = chart;
    seriesRef.current = { candles: candleSeries, volume: volumeSeries };

    // On user time-range change, detect if we’re still at the right edge
    const timeScale = chart.timeScale();
    const handleVisibleRangeChange = () => {
      const visibleRange = timeScale.getVisibleRange();
      if (!visibleRange) return;
      // Our last data timestamp, if known
      const mainSeries = candleSeries;
      const lastBar = mainSeries?.lastValueData?.time as UTCTimestamp | undefined;

      if (!lastBar) return; // no data yet

      // If the right edge of the chart is at or after the last bar,
      // we consider ourselves “at the right edge” => auto-scroll true.
      // If user scrolls left so that the right edge is < lastBar, auto-scroll false.
      if (visibleRange.to >= lastBar) {
        setIsAutoScroll(true);
      } else {
        setIsAutoScroll(false);
      }
    };

    timeScale.subscribeVisibleTimeRangeChange(handleVisibleRangeChange);

    // Resize listener
    const handleResize = () => {
      if (containerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: containerRef.current.clientWidth,
        });
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      timeScale.unsubscribeVisibleTimeRangeChange(handleVisibleRangeChange);
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [displayMode]);

  // --- Whenever token changes or displayMode changes, reprocess the candles
  useEffect(() => {
    updateChart();
    // If we switch from mcap to price or vice versa, we should reset currentCandleRef
    currentCandleRef.current = null;
  }, [token?.recentTrades, displayMode]);

  // --- Subscribe to new trades in real time
  useEffect(() => {
    if (!tokenAddress) return;

    const handleNewTrade = (trade: TokenTrade) => {
      if (trade.tokenAddress === tokenAddress) {
        updateCurrentCandle(trade);
      }
    };

    // Subscribe to the global store's latestTrade
    const unsubscribe = usePumpPortalStore.subscribe(
      state => state.latestTrade,
      handleNewTrade
    );

    return () => unsubscribe();
  }, [tokenAddress, displayMode, solPrice]);

  return (
    <div className="relative bg-[#0D0B1F] rounded-lg p-4 border border-purple-900/30">

      {/* 
        NEW: Moved toggle to the top, above the chart. 
        You can style it however you like. 
      */}
      <div className="mb-2 flex items-center justify-start">
        <div className="bg-purple-900/20 rounded-lg flex">
          <button
            onClick={() => setDisplayMode('price')}
            className={`px-2 py-1 text-sm font-medium rounded-l-lg transition-all ${
              displayMode === 'price'
                ? 'bg-purple-600 text-white'
                : 'text-purple-300 hover:bg-purple-800/30'
            }`}
          >
            Price
          </button>
          <button
            onClick={() => setDisplayMode('mcap')}
            className={`px-2 py-1 text-sm font-medium rounded-r-lg transition-all ${
              displayMode === 'mcap'
                ? 'bg-purple-600 text-white'
                : 'text-purple-300 hover:bg-purple-800/30'
            }`}
          >
            MCap
          </button>
        </div>
      </div>

      {!token && (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-gray-400">Select a token to view chart</p>
        </div>
      )}

      <div ref={containerRef} className="h-[600px] w-full" />
    </div>
  );
};

export default TradingChart;

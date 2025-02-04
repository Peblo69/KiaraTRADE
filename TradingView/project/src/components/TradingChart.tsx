import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  createChart,
  IChartApi,
  ISeriesApi,
  UTCTimestamp,
  CrosshairMode,
  MouseEventParams,
} from 'lightweight-charts';
import { usePumpPortalStore } from '@/lib/pump-portal-websocket';
import { calculatePumpFunTokenMetrics } from '@/utils/token-calculations';

interface TokenTrade {
  tokenAddress: string;
  timestamp: number;
  tokenAmount: number;
  vSolInBondingCurve: number;
  vTokensInBondingCurve: number;
}

interface CandleData {
  time: UTCTimestamp;
  open: number;
  high: number;
  low: number;
  close: number;
}

const TradingChart: React.FC<{ tokenAddress?: string }> = ({ tokenAddress }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);

  // States
  const [timeframe, setTimeframe] = useState<'1s' | '5s' | '1m'>('5s');
  const [displayMode, setDisplayMode] = useState<'price' | 'mcap'>('mcap');
  const [isAutoScroll, setIsAutoScroll] = useState(true);
  const [hoveredCandle, setHoveredCandle] = useState<CandleData | null>(null);

  const token = usePumpPortalStore((s) =>
    tokenAddress ? s.getToken(tokenAddress) : null
  );
  const trades = token?.recentTrades ?? [];
  const solPrice = usePumpPortalStore((s) => s.solPrice);

  // We'll store the final array of candles in a state
  const [candles, setCandles] = useState<CandleData[]>([]);

  // ------------------------------------
  // 1) Create the chart ONCE (no deps!)
  // ------------------------------------
  useEffect(() => {
    console.log('[DEBUG] Creating chart once');
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height: 600,
      layout: {
        background: { type: 'solid', color: '#0D0B1F' },
        textColor: '#d1d4dc',
      },
      grid: {
        vertLines: { color: 'rgba(139, 92, 246, 0.1)' },
        horzLines: { color: 'rgba(139, 92, 246, 0.1)' },
      },
      rightPriceScale: {
        autoScale: true,
        borderVisible: false,
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: true,
        rightOffset: 5,
        borderVisible: false,
      },
      crosshair: {
        mode: CrosshairMode.Magnet,
      },
      kineticScroll: {
        mouse: true,
        touch: true,
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
      },
      handleScale: {
        axisPressedMouseMove: {
          time: true,
          price: true,
        },
        pinch: true,
        mouseWheel: true,
      },
    });

    const candleSeries = chart.addCandlestickSeries({
      upColor: '#26a69a',
      downColor: '#ef5350',
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350',
      borderVisible: false,
    });

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;

    // Resize listener
    const handleResize = () => {
      if (containerRef.current) {
        chart.applyOptions({
          width: containerRef.current.clientWidth,
        });
      }
    };
    window.addEventListener('resize', handleResize);

    // Check user scroll => autoScroll on/off
    const timeScale = chart.timeScale();
    const handleVisibleRangeChange = () => {
      if (!candles.length) return;
      const visibleRange = timeScale.getVisibleRange();
      if (!visibleRange) return;

      const lastTime = candles[candles.length - 1].time;
      if (visibleRange.to >= lastTime) {
        setIsAutoScroll(true);
      } else {
        setIsAutoScroll(false);
      }
    };
    timeScale.subscribeVisibleTimeRangeChange(handleVisibleRangeChange);

    // Crosshair => hovered candle
    const handleCrosshairMove = (param: MouseEventParams) => {
      if (!param.time || !candleSeriesRef.current) {
        setHoveredCandle(null);
        return;
      }
      const bar = param.seriesData.get(candleSeriesRef.current) as any;
      if (bar && 'time' in bar) {
        setHoveredCandle({
          time: bar.time,
          open: bar.open ?? 0,
          high: bar.high ?? 0,
          low: bar.low ?? 0,
          close: bar.close ?? 0,
        });
      } else {
        setHoveredCandle(null);
      }
    };
    chart.subscribeCrosshairMove(handleCrosshairMove);

    // Cleanup on unmount
    return () => {
      console.log('[DEBUG] Unmounting chart');
      chart.unsubscribeCrosshairMove(handleCrosshairMove);
      timeScale.unsubscribeVisibleTimeRangeChange(handleVisibleRangeChange);
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, []); // <--- NO dependencies => won't re-run on data changes

  // -------------------------------------
  // 2) Generate Candle Data (no time gaps)
  // -------------------------------------
  const buildCandles = useCallback((): CandleData[] => {
    if (!trades.length) return [];

    // Sort trades ascending
    const sorted = [...trades].sort((a, b) => a.timestamp - b.timestamp);
    const bucketSec = timeframe === '1s' ? 1 : timeframe === '5s' ? 5 : 60;

    // find earliest + latest in seconds
    const firstSec = Math.floor(sorted[0].timestamp / 1000);
    const lastSec = Math.floor(sorted[sorted.length - 1].timestamp / 1000);

    let result: CandleData[] = [];
    let tradeIndex = 0;
    let currentBucket = Math.floor(firstSec / bucketSec) * bucketSec;
    let endBucket = Math.floor(lastSec / bucketSec) * bucketSec;
    let lastClose = 0;
    let hasFirstCandle = false;

    while (currentBucket <= endBucket) {
      const bucketStart = currentBucket;
      const bucketEnd = currentBucket + bucketSec;
      let bucketTrades: TokenTrade[] = [];

      while (
        tradeIndex < sorted.length &&
        Math.floor(sorted[tradeIndex].timestamp / 1000) >= bucketStart &&
        Math.floor(sorted[tradeIndex].timestamp / 1000) < bucketEnd
      ) {
        bucketTrades.push(sorted[tradeIndex]);
        tradeIndex++;
      }

      if (bucketTrades.length === 0) {
        if (hasFirstCandle) {
          // create a flat candle at lastClose
          result.push({
            time: bucketStart as UTCTimestamp,
            open: lastClose,
            high: lastClose,
            low: lastClose,
            close: lastClose,
          });
        }
      } else {
        let firstPrice = 0;
        let highPrice = Number.MIN_SAFE_INTEGER;
        let lowPrice = Number.MAX_SAFE_INTEGER;
        let lastPrice = 0;

        for (let i = 0; i < bucketTrades.length; i++) {
          const tr = bucketTrades[i];
          const metrics = calculatePumpFunTokenMetrics({
            vSolInBondingCurve: tr.vSolInBondingCurve,
            vTokensInBondingCurve: tr.vTokensInBondingCurve,
            solPrice,
          });
          const val = displayMode === 'price' ? metrics.price.usd : metrics.marketCap.usd;

          if (i === 0) firstPrice = val;
          if (val > highPrice) highPrice = val;
          if (val < lowPrice) lowPrice = val;
          lastPrice = val;
        }

        if (!hasFirstCandle) {
          hasFirstCandle = true;
          lastClose = lastPrice;
          result.push({
            time: bucketStart as UTCTimestamp,
            open: firstPrice,
            high: highPrice,
            low: lowPrice,
            close: lastPrice,
          });
        } else {
          // Align open with last candle's close so no vertical gap
          const prevClose = result[result.length - 1].close;
          if (highPrice < prevClose) highPrice = prevClose;
          if (lowPrice > prevClose) lowPrice = prevClose;

          result.push({
            time: bucketStart as UTCTimestamp,
            open: prevClose,
            high: highPrice,
            low: lowPrice,
            close: lastPrice,
          });
          lastClose = lastPrice;
        }
      }

      currentBucket += bucketSec;
    }

    return result;
  }, [trades, timeframe, displayMode, solPrice]);

  // ------------------------------------
  // 3) Whenever data changes => update
  // ------------------------------------
  useEffect(() => {
    if (!candleSeriesRef.current) return;

    const newCandles = buildCandles();
    setCandles(newCandles);

    candleSeriesRef.current.setData(newCandles);
    if (isAutoScroll) {
      chartRef.current?.timeScale().scrollToRealTime();
    }
  }, [buildCandles, isAutoScroll]);

  // ------------------------------------
  // 4) Listen for new trades in real time
  // ------------------------------------
  useEffect(() => {
    if (!tokenAddress) return;
    const handleNewTrade = (trade: TokenTrade) => {
      if (trade.tokenAddress === tokenAddress) {
        // store updates => effect above will re-run => setData
      }
    };
    const unsub = usePumpPortalStore.subscribe(
      (s) => s.latestTrade,
      handleNewTrade
    );
    return () => unsub();
  }, [tokenAddress]);

  // ------------------------------------
  // Render
  // ------------------------------------
  return (
    <div className="relative bg-[#0D0B1F] rounded-lg p-4 border border-purple-900/30">
      {/* Top toggles */}
      <div className="flex flex-wrap gap-2 mb-2">
        <div className="bg-purple-900/20 rounded-lg flex">
          <button
            onClick={() => setTimeframe('1s')}
            className={`px-2 py-1 text-sm transition-all ${
              timeframe === '1s'
                ? 'bg-purple-600 text-white'
                : 'text-purple-300 hover:bg-purple-800/30'
            }`}
          >
            1s
          </button>
          <button
            onClick={() => setTimeframe('5s')}
            className={`px-2 py-1 text-sm transition-all ${
              timeframe === '5s'
                ? 'bg-purple-600 text-white'
                : 'text-purple-300 hover:bg-purple-800/30'
            }`}
          >
            5s
          </button>
          <button
            onClick={() => setTimeframe('1m')}
            className={`px-2 py-1 text-sm transition-all ${
              timeframe === '1m'
                ? 'bg-purple-600 text-white'
                : 'text-purple-300 hover:bg-purple-800/30'
            }`}
          >
            1m
          </button>
        </div>

        <div className="bg-purple-900/20 rounded-lg flex">
          <button
            onClick={() => setDisplayMode('price')}
            className={`px-2 py-1 text-sm transition-all ${
              displayMode === 'price'
                ? 'bg-purple-600 text-white'
                : 'text-purple-300 hover:bg-purple-800/30'
            }`}
          >
            Price
          </button>
          <button
            onClick={() => setDisplayMode('mcap')}
            className={`px-2 py-1 text-sm transition-all ${
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

      {hoveredCandle && (
        <div
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: '#1e1b33',
            padding: '8px',
            borderRadius: '4px',
            pointerEvents: 'none',
          }}
          className="text-xs text-gray-200"
        >
          <div>Time: {new Date(hoveredCandle.time * 1000).toLocaleTimeString()}</div>
          <div>Open: {hoveredCandle.open.toFixed(2)}</div>
          <div>High: {hoveredCandle.high.toFixed(2)}</div>
          <div>Low: {hoveredCandle.low.toFixed(2)}</div>
          <div>Close: {hoveredCandle.close.toFixed(2)}</div>
        </div>
      )}
    </div>
  );
};

export default TradingChart;

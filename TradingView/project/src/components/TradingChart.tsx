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

// Adjust to your actual trade fields
interface TokenTrade {
  tokenAddress: string;
  timestamp: number; // milliseconds
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

// You can add more if needed, but you mentioned 5s is typical, with 1s and 1m as options
const TIMEFRAME_OPTIONS = {
  '1s': 1,
  '5s': 5,
  '1m': 60,
};

const TradingChart: React.FC<{ tokenAddress?: string }> = ({ tokenAddress }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);

  // 1) Candle timeframe state (defaults to '5s' if you like)
  const [timeframe, setTimeframe] = useState<'1s' | '5s' | '1m'>('5s');

  // 2) Display mode: 'price' or 'mcap'
  const [displayMode, setDisplayMode] = useState<'price' | 'mcap'>('mcap');

  // 3) Auto-scroll: if user is at the right edge, keep scrolling
  const [isAutoScroll, setIsAutoScroll] = useState(true);

  // 4) Hover info for crosshair
  const [hoveredCandle, setHoveredCandle] = useState<CandleData | null>(null);

  // Grab data from store
  const token = usePumpPortalStore((s) =>
    tokenAddress ? s.getToken(tokenAddress) : null
  );
  const trades = token?.recentTrades ?? [];
  const solPrice = usePumpPortalStore((s) => s.solPrice);

  // We'll keep the final array of candles in state, so we can reference the last candle easily
  const [candles, setCandles] = useState<CandleData[]>([]);

  // ------------------------------------------------------------------------------------
  // 1) buildContinuousCandles => EXACT 5-second blocks, with FLAT candle if no trades
  // ------------------------------------------------------------------------------------
  const buildContinuousCandles = useCallback(() => {
    if (!trades.length) return [];

    // Sort trades ascending by timestamp
    const sorted = [...trades].sort((a, b) => a.timestamp - b.timestamp);

    // Convert selected timeframe (like '5s') to numeric seconds
    const bucketSec = TIMEFRAME_OPTIONS[timeframe];

    // earliest & latest trade times in SECONDS
    const firstTradeSec = Math.floor(sorted[0].timestamp / 1000);
    const lastTradeSec = Math.floor(
      sorted[sorted.length - 1].timestamp / 1000
    );

    // We'll walk from earliest -> latest in increments of 'bucketSec'
    let candlesArr: CandleData[] = [];

    // We'll track the last known close (for flat candles if no trades)
    let lastClose = 0;
    let hadPrevCandle = false;

    // We'll also keep an index into 'sorted' to gather trades in each bucket
    let tradeIndex = 0;
    // Convert times to "bucket boundaries"
    let currentBucket = Math.floor(firstTradeSec / bucketSec) * bucketSec;
    const endBucket = Math.floor(lastTradeSec / bucketSec) * bucketSec;

    while (currentBucket <= endBucket) {
      const bucketStart = currentBucket;
      const bucketEnd = currentBucket + bucketSec;

      // Gather all trades that happened in [bucketStart, bucketEnd)
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
        // No trades in this 5s window => produce a FLAT candle if we already have at least 1 candle
        if (!hadPrevCandle) {
          // If it's the very first block and we have no "lastClose", skip until we reach the first trade
          // or you can start from the initial MCAP if you want
        } else {
          // Use lastClose to form a flat candle
          candlesArr.push({
            time: bucketStart as UTCTimestamp,
            open: lastClose,
            high: lastClose,
            low: lastClose,
            close: lastClose,
          });
        }
      } else {
        // At least one trade => form a candle from the first/last of the bucket
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
          const val =
            displayMode === 'price' ? metrics.price.usd : metrics.marketCap.usd;

          if (i === 0) firstPrice = val;
          if (val > highPrice) highPrice = val;
          if (val < lowPrice) lowPrice = val;
          lastPrice = val;
        }

        // If we previously had a candle, ensure we "start" from the last close if you want them connected
        if (!hadPrevCandle && candlesArr.length === 0) {
          // This is the very first candle on the chart:
          hadPrevCandle = true;
          lastClose = lastPrice;
          candlesArr.push({
            time: bucketStart as UTCTimestamp,
            open: firstPrice,
            high: highPrice,
            low: lowPrice,
            close: lastPrice,
          });
        } else {
          // normal subsequent candle
          hadPrevCandle = true;
          // optionally, if you want "open" to match the previous close exactly:
          let openPrice = candlesArr.length
            ? candlesArr[candlesArr.length - 1].close
            : firstPrice;

          // If you want the "open" to reflect the actual first trade in the new block, 
          // just use 'firstPrice'. But you said you want no vertical gap, so we can do:
          // openPrice = the last candle's close
          // but then "high" might be max of (openPrice, highPrice) if we want consistency

          // We'll do exactly your rule: 
          //   - Candle starts from the last candle's close
          //   - Then possibly extends high/low based on trades 
          if (candlesArr.length) {
            openPrice = candlesArr[candlesArr.length - 1].close;
            if (highPrice < openPrice) highPrice = openPrice;
            if (lowPrice > openPrice) lowPrice = openPrice;
          }

          candlesArr.push({
            time: bucketStart as UTCTimestamp,
            open: openPrice,
            high: highPrice,
            low: lowPrice,
            close: lastPrice,
          });
          lastClose = lastPrice;
        }
      }

      currentBucket += bucketSec;
    }

    return candlesArr;
  }, [trades, timeframe, displayMode, solPrice]);

  // -------------------------------------
  // 2) Create Chart ONCE (no re-init)
  // -------------------------------------
  useEffect(() => {
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

    // Resize handler
    const handleResize = () => {
      if (containerRef.current) {
        chart.applyOptions({
          width: containerRef.current.clientWidth,
        });
      }
    };
    window.addEventListener('resize', handleResize);

    // Auto-scroll detection: if user scrolls left, disable
    const timeScale = chart.timeScale();
    const handleVisibleRangeChange = () => {
      const visible = timeScale.getVisibleRange();
      if (!visible || !candles.length) return;
      const lastCandleTime = candles[candles.length - 1].time;
      if (visible.to >= lastCandleTime) {
        setIsAutoScroll(true);
      } else {
        setIsAutoScroll(false);
      }
    };
    timeScale.subscribeVisibleTimeRangeChange(handleVisibleRangeChange);

    // Crosshair => show hover info
    const handleCrosshairMove = (param: MouseEventParams) => {
      if (!param.time) {
        setHoveredCandle(null);
        return;
      }
      const data = param.seriesData.get(candleSeries);
      if (data && 'time' in data) {
        const bar = data as any;
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
      chart.unsubscribeCrosshairMove(handleCrosshairMove);
      timeScale.unsubscribeVisibleTimeRangeChange(handleVisibleRangeChange);
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [candles]);

  // ----------------------------------
  // 3) Build candle data & set to chart
  // ----------------------------------
  useEffect(() => {
    if (!candleSeriesRef.current) return;

    const newCandles = buildContinuousCandles();
    setCandles(newCandles);

    candleSeriesRef.current.setData(newCandles);

    if (isAutoScroll) {
      chartRef.current?.timeScale().scrollToRealTime();
    }
  }, [buildContinuousCandles, isAutoScroll]);

  // -----------------------------
  // 4) Listen for new trades
  // -----------------------------
  useEffect(() => {
    if (!tokenAddress) return;

    const handleNewTrade = (trade: TokenTrade) => {
      if (trade.tokenAddress === tokenAddress) {
        // The store updates => re-run effect => build candles => setData
      }
    };

    const unsubscribe = usePumpPortalStore.subscribe(
      (s) => s.latestTrade,
      handleNewTrade
    );
    return () => unsubscribe();
  }, [tokenAddress]);

  return (
    <div className="relative bg-[#0D0B1F] rounded-lg p-4 border border-purple-900/30">
      {/* -- Top toggles -- */}
      <div className="flex flex-wrap gap-2 mb-2">
        {/* Timeframe */}
        <div className="bg-purple-900/20 rounded-lg flex">
          {Object.keys(TIMEFRAME_OPTIONS).map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf as '1s' | '5s' | '1m')}
              className={`
                px-2 py-1 text-sm font-medium transition-all
                ${
                  timeframe === tf
                    ? 'bg-purple-600 text-white'
                    : 'text-purple-300 hover:bg-purple-800/30'
                }
              `}
            >
              {tf}
            </button>
          ))}
        </div>

        {/* Price / MCap */}
        <div className="bg-purple-900/20 rounded-lg flex">
          <button
            onClick={() => setDisplayMode('price')}
            className={`
              px-2 py-1 text-sm font-medium transition-all
              ${
                displayMode === 'price'
                  ? 'bg-purple-600 text-white'
                  : 'text-purple-300 hover:bg-purple-800/30'
              }
            `}
          >
            Price
          </button>
          <button
            onClick={() => setDisplayMode('mcap')}
            className={`
              px-2 py-1 text-sm font-medium transition-all
              ${
                displayMode === 'mcap'
                  ? 'bg-purple-600 text-white'
                  : 'text-purple-300 hover:bg-purple-800/30'
              }
            `}
          >
            MCap
          </button>
        </div>
      </div>

      {/* If no token is selected */}
      {!token && (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-gray-400">Select a token to view chart</p>
        </div>
      )}

      {/* Chart container */}
      <div ref={containerRef} className="h-[600px] w-full" />

      {/* Hovered candle tooltip in top-right */}
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

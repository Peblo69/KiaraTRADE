import React, { useEffect, useRef } from 'react';
import { LineChart } from 'lucide-react';
import { usePumpPortalStore } from '@/lib/pump-portal-websocket';
import { calculatePumpFunTokenMetrics } from '@/utils/token-calculations';

interface Props {
  tokenAddress: string;
}

const TradingChart: React.FC<Props> = ({ tokenAddress }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  // Get exact same data as your other components
  const token = usePumpPortalStore(state => state.getToken(tokenAddress));
  const solPrice = usePumpPortalStore(state => state.solPrice);
  const trades = token?.recentTrades || [];

  useEffect(() => {
    if (!token || !trades.length) return;

    // Pre-calculate prices to ensure they're ready
    const metrics = calculatePumpFunTokenMetrics({
      vSolInBondingCurve: token.vSolInBondingCurve,
      vTokensInBondingCurve: token.vTokensInBondingCurve,
      solPrice
    });

    console.log('[Chart] Initial metrics:', {
      token: token.symbol,
      priceUSD: metrics.price.usd,
      priceSol: metrics.price.sol,
      trades: trades.length
    });

    const script = document.createElement('script');
    script.src = 'https://unpkg.com/lightweight-charts/dist/lightweight-charts.standalone.production.js';
    script.async = true;

    script.onload = () => {
      if (!containerRef.current || !window.LightweightCharts) return;

      // Cleanup old chart properly
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }

      const chart = window.LightweightCharts.createChart(containerRef.current, {
        layout: {
          background: { color: '#0D0B1F' },
          textColor: '#d1d4dc',
        },
        grid: {
          vertLines: { color: 'rgba(42, 46, 57, 0.2)' },
          horzLines: { color: 'rgba(42, 46, 57, 0.2)' },
        },
        width: containerRef.current.clientWidth,
        height: 500,
        timeScale: {
          timeVisible: true,
          secondsVisible: true,
          borderColor: '#485c7b',
        },
        rightPriceScale: {
          borderColor: '#485c7b',
        },
        crosshair: {
          mode: 1,
          vertLine: {
            color: '#758696',
            width: 1,
            labelBackgroundColor: '#0D0B1F',
          },
          horzLine: {
            color: '#758696',
            width: 1,
            labelBackgroundColor: '#0D0B1F',
          },
        },
      });

      const candleSeries = chart.addCandlestickSeries({
        upColor: '#26a69a',
        downColor: '#ef5350',
        borderUpColor: '#26a69a',
        borderDownColor: '#ef5350',
        wickUpColor: '#26a69a',
        wickDownColor: '#ef5350',
      });

      const volumeSeries = chart.addHistogramSeries({
        color: '#385263',
        priceFormat: {
          type: 'volume',
        },
        priceScaleId: '', 
        scaleMargins: {
          top: 0.8,
          bottom: 0,
        },
      });

      // Process trades using store's calculation logic
      const ohlcData = new Map();
      const minuteInMs = 60000;

      trades.forEach(trade => {
        const tradeMetrics = calculatePumpFunTokenMetrics({
          vSolInBondingCurve: trade.vSolInBondingCurve,
          vTokensInBondingCurve: trade.vTokensInBondingCurve,
          solPrice
        });

        const timestamp = Math.floor(trade.timestamp / minuteInMs) * minuteInMs;

        if (!ohlcData.has(timestamp)) {
          ohlcData.set(timestamp, {
            time: timestamp / 1000,
            open: tradeMetrics.price.usd,
            high: tradeMetrics.price.usd,
            low: tradeMetrics.price.usd,
            close: tradeMetrics.price.usd,
            volume: trade.tokenAmount
          });
        } else {
          const candle = ohlcData.get(timestamp);
          candle.high = Math.max(candle.high, tradeMetrics.price.usd);
          candle.low = Math.min(candle.low, tradeMetrics.price.usd);
          candle.close = tradeMetrics.price.usd;
          candle.volume += trade.tokenAmount;
        }
      });

      const candleData = Array.from(ohlcData.values())
        .sort((a, b) => a.time - b.time);

      if (candleData.length > 0) {
        console.log('[Chart] Candle data:', {
          first: candleData[0],
          last: candleData[candleData.length - 1],
          count: candleData.length
        });

        candleSeries.setData(candleData);
        volumeSeries.setData(candleData);
      }

      // Set up real-time updates
      const handleResize = () => {
        if (containerRef.current) {
          chart.applyOptions({
            width: containerRef.current.clientWidth
          });
        }
      };

      window.addEventListener('resize', handleResize);

      // Store cleanup function
      cleanupRef.current = () => {
        window.removeEventListener('resize', handleResize);
        if (chart) {
          chart.remove();
        }
        containerRef.current?.innerHTML = '';
      };

      chartRef.current = chart;
    };

    document.head.appendChild(script);

    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
      if (cleanupRef.current) {
        cleanupRef.current();
      }
    };
  }, [tokenAddress, trades.length]); // Only rerender when trades change

  return (
    <div className="relative bg-[#0D0B1F] rounded-lg p-4 border border-purple-900/30">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <LineChart className="w-5 h-5 text-purple-400" />
          <h2 className="text-purple-100 font-semibold">
            {token?.symbol || tokenAddress.slice(0, 6)}... Price Chart
          </h2>
        </div>
      </div>
      <div ref={containerRef} className="h-[500px] w-full" />
    </div>
  );
};

export default TradingChart;
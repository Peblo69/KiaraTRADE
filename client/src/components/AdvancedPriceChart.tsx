import { useEffect, useRef } from 'react';
import { createChart, CrosshairMode, IChartApi, ISeriesApi, LineStyle, Time } from 'lightweight-charts';

interface ChartProps {
  symbol: string;
  data: {
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }[];
  indicators: {
    rsi: number;
    macd: number;
    ema: number;
    bollingerBands: {
      upper: number;
      middle: number;
      lower: number;
    };
    volumeProfile: {
      value: number;
      strength: number;
    };
    fibonacci: {
      levels: number[];
      current: number;
    };
    pivotPoints: {
      pivot: number;
      r1: number;
      r2: number;
      s1: number;
      s2: number;
    };
  };
  onTimeRangeChange?: (range: { from: number; to: number }) => void;
}

export function AdvancedPriceChart({ symbol, data, indicators, onTimeRangeChange }: ChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Initialize chart
    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 400, // Reduced height from 600 to 400
      layout: {
        background: { color: 'rgb(19, 23, 34)' },
        textColor: '#d1d4dc',
      },
      grid: {
        vertLines: { color: 'rgba(42, 46, 57, 0.5)' },
        horzLines: { color: 'rgba(42, 46, 57, 0.5)' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
      },
      rightPriceScale: {
        borderColor: 'rgba(197, 203, 206, 0.8)',
      },
      timeScale: {
        borderColor: 'rgba(197, 203, 206, 0.8)',
        timeVisible: true,
        secondsVisible: false,
      },
    });

    // Add candlestick series
    const candlestickSeries = chart.addCandlestickSeries({
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderVisible: false,
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350',
    });

    // Format data for chart
    const formattedData = data.map(d => ({
      time: d.time as Time,
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close,
    }));

    candlestickSeries.setData(formattedData);

    // Add Bollinger Bands if available
    if (indicators.bollingerBands) {
      const upperBandSeries = chart.addLineSeries({
        color: 'rgba(250, 250, 250, 0.3)',
        lineWidth: 1,
        lineStyle: LineStyle.Dotted,
      });

      const middleBandSeries = chart.addLineSeries({
        color: 'rgba(250, 250, 250, 0.6)',
        lineWidth: 1,
      });

      const lowerBandSeries = chart.addLineSeries({
        color: 'rgba(250, 250, 250, 0.3)',
        lineWidth: 1,
        lineStyle: LineStyle.Dotted,
      });

      // Set Bollinger Bands data
      const bbData = data.map(d => ({
        time: d.time as Time,
        value: indicators.bollingerBands.upper,
      }));
      upperBandSeries.setData(bbData);

      const middleBBData = data.map(d => ({
        time: d.time as Time,
        value: indicators.bollingerBands.middle,
      }));
      middleBandSeries.setData(middleBBData);

      const lowerBBData = data.map(d => ({
        time: d.time as Time,
        value: indicators.bollingerBands.lower,
      }));
      lowerBandSeries.setData(lowerBBData);
    }

    // Add Fibonacci Levels if available
    if (indicators.fibonacci?.levels) {
      indicators.fibonacci.levels.forEach((level, index) => {
        const series = chart.addLineSeries({
          color: 'rgba(255, 215, 0, 0.3)',
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
        });
        series.setData(data.map(d => ({
          time: d.time as Time,
          value: level
        })));
      });
    }

    // Add Pivot Points if available
    if (indicators.pivotPoints) {
      const { pivot, r1, r2, s1, s2 } = indicators.pivotPoints;
      const timeRange = data.map(d => ({ time: d.time as Time }));

      const pivotSeries = chart.addLineSeries({
        color: 'rgba(255, 255, 255, 0.6)',
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
      });

      const r1Series = chart.addLineSeries({
        color: 'rgba(76, 175, 80, 0.4)',
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
      });

      const r2Series = chart.addLineSeries({
        color: 'rgba(76, 175, 80, 0.6)',
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
      });

      const s1Series = chart.addLineSeries({
        color: 'rgba(244, 67, 54, 0.4)',
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
      });

      const s2Series = chart.addLineSeries({
        color: 'rgba(244, 67, 54, 0.6)',
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
      });

      pivotSeries.setData(timeRange.map(t => ({ ...t, value: pivot })));
      r1Series.setData(timeRange.map(t => ({ ...t, value: r1 })));
      r2Series.setData(timeRange.map(t => ({ ...t, value: r2 })));
      s1Series.setData(timeRange.map(t => ({ ...t, value: s1 })));
      s2Series.setData(timeRange.map(t => ({ ...t, value: s2 })));
    }

    // Add volume series
    const volumeSeries = chart.addHistogramSeries({
      color: '#26a69a',
      priceFormat: {
        type: 'volume',
      },
      priceScaleId: '', // Set as an overlay
      scaleMargins: {
        top: 0.8,
        bottom: 0,
      },
    });

    // Set volume data
    volumeSeries.setData(data.map(d => ({
      time: d.time as Time,
      value: d.volume,
      color: d.close >= d.open ? '#26a69a50' : '#ef535050',
    })));

    // Add legends
    const legend = document.createElement('div');
    legend.style.position = 'absolute';
    legend.style.left = '12px';
    legend.style.top = '12px';
    legend.style.zIndex = '1';
    legend.style.fontSize = '12px';
    legend.style.color = 'white';
    legend.style.background = 'rgba(19, 23, 34, 0.6)';
    legend.style.padding = '8px';
    legend.style.borderRadius = '4px';
    chartContainerRef.current.appendChild(legend);

    const updateLegend = (param: any) => {
      const price = param.seriesData.get(candlestickSeries);
      if (!price) return;

      const pivotInfo = indicators.pivotPoints;
      legend.innerHTML = `
        <div>O: ${price.open.toFixed(2)}</div>
        <div>H: ${price.high.toFixed(2)}</div>
        <div>L: ${price.low.toFixed(2)}</div>
        <div>C: ${price.close.toFixed(2)}</div>
        <div class="mt-2 pt-2 border-t border-gray-600">
          <div>Pivot: ${pivotInfo.pivot.toFixed(2)}</div>
          <div class="text-green-400">R1: ${pivotInfo.r1.toFixed(2)}</div>
          <div class="text-green-400">R2: ${pivotInfo.r2.toFixed(2)}</div>
          <div class="text-red-400">S1: ${pivotInfo.s1.toFixed(2)}</div>
          <div class="text-red-400">S2: ${pivotInfo.s2.toFixed(2)}</div>
        </div>
      `;
    };

    chart.subscribeCrosshairMove(updateLegend);

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener('resize', handleResize);

    // Store refs
    chartRef.current = chart;
    candlestickSeriesRef.current = candlestickSeries;

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [data, indicators]);

  return (
    <div className="relative">
      <div className="absolute top-0 right-0 z-10 flex gap-2 p-2">
        <button 
          className="px-3 py-1 text-xs text-white bg-gray-800 rounded hover:bg-gray-700"
          onClick={() => chartRef.current?.timeScale().fitContent()}
        >
          Fit All
        </button>
      </div>
      <div ref={chartContainerRef} className="w-full" />
    </div>
  );
}
import { useEffect, useRef } from 'react';
import { createChart, CrosshairMode, IChartApi, ISeriesApi, LineStyle } from 'lightweight-charts';

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
    rsi: number[];
    macd: number[];
    ema: number[];
    bollingerBands: {
      upper: number[];
      middle: number[];
      lower: number[];
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
      height: 600,
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

    // Add Bollinger Bands
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

    // Set data
    candlestickSeries.setData(data.map(d => ({
      time: d.time,
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close,
    })));

    // Set Bollinger Bands data
    const bbData = data.map((d, i) => ({
      time: d.time,
      value: indicators.bollingerBands.upper[i],
    }));
    upperBandSeries.setData(bbData);

    const middleBBData = data.map((d, i) => ({
      time: d.time,
      value: indicators.bollingerBands.middle[i],
    }));
    middleBandSeries.setData(middleBBData);

    const lowerBBData = data.map((d, i) => ({
      time: d.time,
      value: indicators.bollingerBands.lower[i],
    }));
    lowerBandSeries.setData(lowerBBData);

    // Set volume data
    volumeSeries.setData(data.map(d => ({
      time: d.time,
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

      legend.innerHTML = `
        <div>O: ${price.open.toFixed(2)}</div>
        <div>H: ${price.high.toFixed(2)}</div>
        <div>L: ${price.low.toFixed(2)}</div>
        <div>C: ${price.close.toFixed(2)}</div>
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

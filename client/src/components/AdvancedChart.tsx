import React from 'react';
import { createChart, IChartApi } from 'lightweight-charts';

interface Props {
  data: Array<{
    time: string;
    value: number;
  }>;
  height?: number;
  width?: number;
}

export default function AdvancedChart({ data, height = 300, width = 600 }: Props) {
  const chartContainerRef = React.useRef<HTMLDivElement>(null);
  const [chart, setChart] = React.useState<IChartApi | null>(null);

  React.useEffect(() => {
    if (chartContainerRef.current) {
      const chartInstance = createChart(chartContainerRef.current, {
        height,
        width,
        layout: {
          background: { color: 'transparent' },
          textColor: '#DDD',
        },
        grid: {
          vertLines: { color: '#2B2B43' },
          horzLines: { color: '#2B2B43' },
        },
      });

      const lineSeries = chartInstance.addLineSeries({
        color: '#A855F7',
        lineWidth: 2,
      });

      lineSeries.setData(data);
      setChart(chartInstance);

      return () => {
        chartInstance.remove();
      };
    }
  }, [data, height, width]);

  return <div ref={chartContainerRef} />;
}
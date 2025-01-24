import React from 'react';
import { createChart, IChartApi, ColorType } from 'lightweight-charts';

interface Props {
  className?: string;
}

const AdvancedChart: React.FC<Props> = ({ className = '' }) => {
  const chartContainerRef = React.useRef<HTMLDivElement>(null);
  const chartRef = React.useRef<IChartApi | null>(null);

  React.useEffect(() => {
    if (chartContainerRef.current) {
      const chart = createChart(chartContainerRef.current, {
        layout: {
          background: { color: '#000000' as ColorType },
          textColor: '#DDD',
        },
        width: chartContainerRef.current.clientWidth,
        height: 400,
      });

      chartRef.current = chart;

      const handleResize = () => {
        if (chartContainerRef.current && chartRef.current) {
          chartRef.current.applyOptions({
            width: chartContainerRef.current.clientWidth,
          });
        }
      };

      window.addEventListener('resize', handleResize);

      return () => {
        window.removeEventListener('resize', handleResize);
        if (chartRef.current) {
          chartRef.current.remove();
        }
      };
    }
  }, []);

  return (
    <div className={className}>
      <div ref={chartContainerRef} />
    </div>
  );
};

export { AdvancedChart };
export default AdvancedChart;
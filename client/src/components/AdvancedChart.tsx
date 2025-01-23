// client/src/components/AdvancedChart.tsx

import { FC } from "react";
import { Line } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, TimeScale } from 'chart.js';
import 'chartjs-adapter-date-fns';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  TimeScale
);

interface PriceHistoryData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface AdvancedChartProps {
  data: PriceHistoryData[];
  timeframe: string;
  onTimeframeChange: (tf: string) => void;
  symbol: string;
  className?: string;
}

const AdvancedChart: FC<AdvancedChartProps> = ({ data, timeframe, onTimeframeChange, symbol, className }) => {
  const chartData = {
    labels: data.map(d => new Date(d.time * 1000)),
    datasets: [
      {
        label: `${symbol} Price`,
        data: data.map(d => d.close),
        fill: false,
        borderColor: 'rgba(128, 0, 128, 0.7)',
        tension: 0.1
      }
    ]
  };

  const options = {
    scales: {
      x: {
        type: 'time' as const,
        time: {
          unit: timeframe
        }
      },
      y: {
        beginAtZero: false
      }
    }
  };

  return (
    <div className={className}>
      <Line data={chartData} options={options} />
      {/* Add timeframe buttons or controls here if needed */}
    </div>
  );
};

export default AdvancedChart;

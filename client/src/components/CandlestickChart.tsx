import { FC, memo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Line
} from 'recharts';
import { format } from 'date-fns';

interface CandleData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  marketCap: number;
}

interface Props {
  data: CandleData[];
}

const CandlestickChartBase: FC<Props> = ({ data }) => {
  const formatXAxis = (timestamp: number) => {
    return format(new Date(timestamp), 'HH:mm');
  };

  const formatYAxis = (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
    return value.toFixed(2);
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-gray-900/90 backdrop-blur-lg border border-gray-800 p-2 rounded-lg text-sm">
          <p className="text-gray-400">{format(new Date(data.timestamp), 'HH:mm:ss')}</p>
          <p className="text-white">Price: {data.close.toFixed(6)} SOL</p>
          <p className="text-blue-400">Volume: {formatYAxis(data.volume)} SOL</p>
          <p className="text-green-400">MCap: {formatYAxis(data.marketCap)} SOL</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-48">
      <ResponsiveContainer>
        <ComposedChart data={data}>
          {/* Price candlesticks */}
          <Bar
            dataKey="low"
            fill="transparent"
            stroke="none"
            yAxisId="price"
          />
          <Bar
            dataKey="high"
            fill="transparent"
            stroke="none"
            yAxisId="price"
          />

          {/* Market cap line */}
          <Line
            type="monotone"
            dataKey="marketCap"
            stroke="#22c55e"
            strokeWidth={1}
            dot={false}
            yAxisId="marketCap"
          />

          {/* Volume bars */}
          <Bar
            dataKey="volume"
            fill="rgba(59, 130, 246, 0.1)"
            stroke="#3b82f6"
            yAxisId="volume"
          />

          {/* Price line */}
          <Line
            type="linear"
            dataKey="close"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={false}
            yAxisId="price"
          />

          <XAxis
            dataKey="timestamp"
            tickFormatter={formatXAxis}
            stroke="#4b5563"
            tick={{ fill: '#9ca3af' }}
          />

          <YAxis
            yAxisId="price"
            orientation="right"
            tickFormatter={formatYAxis}
            stroke="#4b5563"
            tick={{ fill: '#9ca3af' }}
          />

          <YAxis
            yAxisId="volume"
            orientation="left"
            tickFormatter={formatYAxis}
            stroke="#4b5563"
            tick={{ fill: '#9ca3af' }}
          />

          <YAxis
            yAxisId="marketCap"
            orientation="right"
            tickFormatter={formatYAxis}
            stroke="#4b5563"
            tick={{ fill: '#9ca3af' }}
          />

          <Tooltip content={<CustomTooltip />} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

export const CandlestickChart = memo(CandlestickChartBase);
export default CandlestickChart;
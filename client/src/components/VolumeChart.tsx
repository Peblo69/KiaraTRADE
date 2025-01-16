import { FC } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { motion } from 'framer-motion';

interface VolumeChartProps {
  data: {
    timestamp: number;
    volume: number;
  }[];
}

export const VolumeChart: FC<VolumeChartProps> = ({ data }) => {
  // Format volume numbers for tooltip
  const formatVolume = (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(2)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(2)}K`;
    return value.toFixed(2);
  };

  // Format timestamp for x-axis
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full h-[120px] mt-4"
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
        >
          <defs>
            <linearGradient id="volumeGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="timestamp"
            tickFormatter={formatTime}
            stroke="#4b5563"
            fontSize={10}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tickFormatter={formatVolume}
            stroke="#4b5563"
            fontSize={10}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                return (
                  <div className="bg-gray-900/90 backdrop-blur-sm border border-gray-800 p-2 rounded-lg shadow-xl">
                    <p className="text-gray-400 text-xs">
                      {formatTime(payload[0].payload.timestamp)}
                    </p>
                    <p className="text-blue-400 font-semibold">
                      {formatVolume(payload[0].value as number)} SOL
                    </p>
                  </div>
                );
              }
              return null;
            }}
          />
          <Area
            type="monotone"
            dataKey="volume"
            stroke="#3b82f6"
            strokeWidth={2}
            fill="url(#volumeGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </motion.div>
  );
};

export default VolumeChart;

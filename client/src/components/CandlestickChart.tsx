import { FC, memo, useMemo, useCallback } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Line,
  CartesianGrid
} from 'recharts';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
  data?: CandleData[];
  timeframe?: '1m' | '5m' | '15m' | '1h' | '4h' | '1d';
  onTimeframeChange?: (timeframe: string) => void;
  className?: string;
}

const timeframes = ['1m', '5m', '15m', '1h', '4h', '1d'];

const formatXAxis = (timestamp: number) => {
  return format(new Date(timestamp), 'HH:mm');
};

const formatYAxis = (value: number) => {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return value.toFixed(6);
};

const CustomTooltip = memo(({ active, payload }: any) => {
  if (active && payload?.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-background/95 backdrop-blur-sm border border-border/40 p-3 rounded-lg shadow-lg">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            {format(new Date(data.timestamp), 'HH:mm:ss')}
          </p>
          <div className="grid gap-1">
            <div className="grid grid-cols-2 gap-4">
              <span className="text-sm text-muted-foreground">Open</span>
              <span className="text-sm font-medium">${data.open.toFixed(6)}</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <span className="text-sm text-muted-foreground">High</span>
              <span className="text-sm font-medium text-green-500">${data.high.toFixed(6)}</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <span className="text-sm text-muted-foreground">Low</span>
              <span className="text-sm font-medium text-red-500">${data.low.toFixed(6)}</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <span className="text-sm text-muted-foreground">Close</span>
              <span className="text-sm font-medium">${data.close.toFixed(6)}</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <span className="text-sm text-muted-foreground">Volume</span>
              <span className="text-sm font-medium text-blue-500">${formatYAxis(data.volume)}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }
  return null;
});

CustomTooltip.displayName = 'CustomTooltip';

const CandlestickChartBase: FC<Props> = ({ 
  data = [], // Default to empty array
  timeframe = '1m',
  onTimeframeChange,
  className 
}) => {
  // Memoize chart data transformations
  const chartData = useMemo(() => {
    if (!Array.isArray(data)) return [];

    return data.map(candle => ({
      ...candle,
      color: candle.close >= candle.open ? '#22c55e' : '#ef4444',
      volumeColor: candle.close >= candle.open ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
    }));
  }, [data]);

  const handleTimeframeChange = useCallback((newTimeframe: string) => {
    onTimeframeChange?.(newTimeframe);
  }, [onTimeframeChange]);

  // Early return if no data
  if (!chartData.length) {
    return (
      <Card className={cn("w-full", className)}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <h3 className="font-semibold text-lg">Price Chart</h3>
          <div className="flex gap-2">
            {timeframes.map((tf) => (
              <Button
                key={tf}
                variant={tf === timeframe ? "default" : "outline"}
                size="sm"
                onClick={() => handleTimeframeChange(tf)}
                className="text-xs"
              >
                {tf}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="h-[400px] flex items-center justify-center">
          <p className="text-muted-foreground">No data available for this timeframe</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <h3 className="font-semibold text-lg">Price Chart</h3>
        <div className="flex gap-2">
          {timeframes.map((tf) => (
            <Button
              key={tf}
              variant={tf === timeframe ? "default" : "outline"}
              size="sm"
              onClick={() => handleTimeframeChange(tf)}
              className="text-xs"
            >
              {tf}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[400px] w-full">
          <ResponsiveContainer>
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />

              <Bar
                dataKey="volume"
                yAxisId="volume"
                fill={d => d.volumeColor}
                opacity={0.3}
                isAnimationActive={false}
              />

              <Line
                type="linear"
                dataKey="close"
                stroke="hsl(var(--primary))"
                dot={false}
                yAxisId="price"
                isAnimationActive={false}
              />

              <Line
                type="monotone"
                dataKey="marketCap"
                stroke="#22c55e"
                strokeWidth={1}
                dot={false}
                yAxisId="marketCap"
                isAnimationActive={false}
              />

              <XAxis
                dataKey="timestamp"
                tickFormatter={formatXAxis}
                stroke="hsl(var(--muted))"
              />

              <YAxis
                yAxisId="price"
                orientation="right"
                tickFormatter={formatYAxis}
                stroke="hsl(var(--muted))"
              />

              <YAxis
                yAxisId="volume"
                orientation="left"
                tickFormatter={formatYAxis}
                stroke="hsl(var(--muted))"
              />

              <YAxis
                yAxisId="marketCap"
                orientation="right"
                tickFormatter={formatYAxis}
                stroke="hsl(var(--muted))"
              />

              <Tooltip content={<CustomTooltip />} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export const CandlestickChart = memo(CandlestickChartBase);
export default CandlestickChart;
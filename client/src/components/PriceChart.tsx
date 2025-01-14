import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface PricePoint {
  timestamp: number;
  price: number;
}

// Generate mock data for the last 24 hours
const generateMockData = (): PricePoint[] => {
  const data: PricePoint[] = [];
  const now = Date.now();
  const basePrice = 45000; // Base BTC price

  for (let i = 0; i < 100; i++) {
    const timestamp = now - (100 - i) * 15 * 60 * 1000; // Every 15 minutes
    const randomChange = (Math.random() - 0.5) * 1000; // Random price variation
    data.push({
      timestamp,
      price: basePrice + randomChange
    });
  }
  return data;
};

export default function PriceChart() {
  const [data, setData] = useState<PricePoint[]>(generateMockData());

  // Update data every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setData(prev => {
        const lastPrice = prev[prev.length - 1].price;
        const randomChange = (Math.random() - 0.5) * 200;
        const newPoint = {
          timestamp: Date.now(),
          price: lastPrice + randomChange
        };
        const newData = [...prev.slice(1), newPoint];
        return newData;
      });
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  return (
    <Card className="h-[500px] p-4 backdrop-blur-sm bg-purple-900/10 border-purple-500/20">
      <h2 className="text-lg font-semibold text-purple-300 mb-4">BTC/USD Live Chart</h2>
      <ResponsiveContainer width="100%" height="90%">
        <LineChart data={data}>
          <XAxis
            dataKey="timestamp"
            tickFormatter={(ts) => new Date(ts).toLocaleTimeString()}
            stroke="#6b7280"
          />
          <YAxis stroke="#6b7280" />
          <Tooltip
            contentStyle={{
              backgroundColor: "rgba(17, 24, 39, 0.9)",
              border: "1px solid rgba(139, 92, 246, 0.2)",
            }}
          />
          <Line
            type="monotone"
            dataKey="price"
            stroke="#8b5cf6"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
}
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
import { useQuery } from "@tanstack/react-query";

interface PricePoint {
  timestamp: number;
  price: number;
}

interface MarketData {
  market_cap: {
    value: number;
    change_24h: number;
  };
  btc_dominance: number;
}

export default function PriceChart() {
  const [data, setData] = useState<PricePoint[]>([]);

  // Use React Query to fetch market data
  const { data: marketData } = useQuery<MarketData>({
    queryKey: ["/api/market/overview"],
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  // Update chart data when market data changes
  useEffect(() => {
    if (marketData?.market_cap && typeof marketData.btc_dominance === 'number') {
      setData(prev => {
        const newPrice = {
          timestamp: Date.now(),
          price: marketData.market_cap.value * (marketData.btc_dominance / 100)
        };
        const newData = [...prev, newPrice];
        if (newData.length > 100) newData.shift();
        return newData;
      });
    }
  }, [marketData]);

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
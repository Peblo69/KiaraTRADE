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
import { connectToWebSocket, type BinanceTickerData } from "@/lib/websocket";

interface PricePoint {
  timestamp: number;
  price: number;
}

export default function PriceChart() {
  const [data, setData] = useState<PricePoint[]>([]);

  useEffect(() => {
    const ws = connectToWebSocket();

    const handleMessage = (event: MessageEvent) => {
      try {
        const newPrice = JSON.parse(event.data) as BinanceTickerData;
        if (newPrice.symbol === "BTC") {
          setData(prev => {
            const newData = [...prev, {
              timestamp: Date.now(),
              price: parseFloat(newPrice.price)
            }];
            if (newData.length > 100) newData.shift();
            return newData;
          });
        }
      } catch (error) {
        console.error('Error parsing websocket message:', error);
      }
    };

    ws.addEventListener("message", handleMessage);

    return () => {
      ws.removeEventListener("message", handleMessage);
      ws.close();
    };
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
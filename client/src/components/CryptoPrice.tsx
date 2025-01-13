import { Card } from "@/components/ui/card";
import { useEffect, useState } from "react";
import { connectToWebSocket, type BinanceTickerData } from "@/lib/websocket";

interface CryptoPriceProps {
  coin: string;
}

interface PriceData {
  current_price: number;
  price_change_percentage_24h: number;
}

export default function CryptoPrice({ coin }: CryptoPriceProps) {
  const [priceData, setPriceData] = useState<PriceData>({
    current_price: 0,
    price_change_percentage_24h: 0
  });

  useEffect(() => {
    const ws = connectToWebSocket();

    const handleMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data) as BinanceTickerData;
        if (data.symbol === coin.toUpperCase()) {
          setPriceData({
            current_price: parseFloat(data.price),
            price_change_percentage_24h: parseFloat(data.change24h)
          });
        }
      } catch (error) {
        console.error('Error handling websocket message:', error);
      }
    };

    ws.addEventListener("message", handleMessage);

    return () => {
      ws.removeEventListener("message", handleMessage);
      ws.close();
    };
  }, [coin]);

  return (
    <Card className="p-4 backdrop-blur-sm bg-purple-900/10 border-purple-500/20 hover:border-purple-500/40 transition-colors">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-purple-300">{coin.toUpperCase()}/USD</h3>
        <div className={`flex items-center ${priceData.price_change_percentage_24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
          <span>{priceData.price_change_percentage_24h.toFixed(2)}%</span>
        </div>
      </div>
      <div className="mt-2 text-2xl font-bold">${priceData.current_price.toLocaleString()}</div>
    </Card>
  );
}
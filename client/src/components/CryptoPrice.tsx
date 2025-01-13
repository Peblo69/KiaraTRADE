import { Card } from "@/components/ui/card";
import { useEffect, useState } from "react";
import axios from "axios";

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
    const fetchPrice = async () => {
      try {
        const response = await axios.get(
          `https://api.coingecko.com/api/v3/simple/price?ids=${coin}&vs_currencies=usd&include_24hr_change=true`
        );
        const data = response.data[coin];
        setPriceData({
          current_price: data.usd,
          price_change_percentage_24h: data.usd_24h_change
        });
      } catch (error) {
        console.error('Error fetching price:', error);
      }
    };

    fetchPrice();
    const interval = setInterval(fetchPrice, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
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
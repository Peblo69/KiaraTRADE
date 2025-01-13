import { Card } from "@/components/ui/card";
import { useEffect, useState } from "react";
import axios from "axios";
import { cn } from "@/lib/utils";

interface CryptoPriceProps {
  coin: string;
  className?: string;
}

interface PriceData {
  current_price: number;
  price_change_percentage_24h: number;
}

export default function CryptoPrice({ coin, className }: CryptoPriceProps) {
  const [priceData, setPriceData] = useState<PriceData>({
    current_price: 0,
    price_change_percentage_24h: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPrice = async () => {
      try {
        setIsLoading(true);
        setError(null);
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
        setError('Failed to fetch price data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPrice();
    const interval = setInterval(fetchPrice, 30000); // Update prices every 30 seconds

    return () => clearInterval(interval);
  }, [coin]);

  const formatCurrency = (value: number) => {
    if (value >= 1) {
      return value.toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
    } else {
      return value.toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 6,
        maximumFractionDigits: 6
      });
    }
  };

  return (
    <Card 
      className={cn(
        "p-4 backdrop-blur-sm bg-purple-900/10 border-purple-500/20 hover:border-purple-500/40 transition-colors",
        className
      )}
    >
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-purple-300">{coin.toUpperCase()}/USD</h3>
        {!isLoading && !error && (
          <div className={`flex items-center ${priceData.price_change_percentage_24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            <span>{priceData.price_change_percentage_24h.toFixed(2)}%</span>
          </div>
        )}
      </div>
      <div className="mt-2">
        {isLoading ? (
          <div className="h-8 bg-purple-500/20 animate-pulse rounded" />
        ) : error ? (
          <div className="text-red-400 text-sm">{error}</div>
        ) : (
          <div className="text-2xl font-bold">
            {formatCurrency(priceData.current_price)}
          </div>
        )}
      </div>
    </Card>
  );
}
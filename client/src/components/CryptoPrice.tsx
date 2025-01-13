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
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const fetchPrice = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Add exponential backoff for retries
        const backoffDelay = Math.min(1000 * Math.pow(2, retryCount), 10000);
        if (retryCount > 0) {
          await new Promise(resolve => setTimeout(resolve, backoffDelay));
        }

        const response = await axios.get(
          `https://api.coingecko.com/api/v3/simple/price?ids=${coin}&vs_currencies=usd&include_24hr_change=true`,
          { timeout: 5000 } // Add timeout
        );

        const data = response.data[coin];
        if (!data) {
          throw new Error('Invalid response format');
        }

        setPriceData({
          current_price: data.usd,
          price_change_percentage_24h: data.usd_24h_change
        });

        // Reset retry count on success
        if (retryCount > 0) setRetryCount(0);
      } catch (error: any) {
        console.error('Error fetching price:', error);
        setError('Failed to fetch price data');
        setRetryCount(prev => prev + 1);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPrice();
    // Increased interval to 60 seconds to respect rate limits
    const interval = setInterval(fetchPrice, 60000);

    return () => clearInterval(interval);
  }, [coin, retryCount]);

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

  // Dynamic color classes based on price change
  const getPriceChangeColor = (change: number) => {
    if (change > 5) return 'text-green-400 font-bold';
    if (change > 0) return 'text-green-400';
    if (change < -5) return 'text-red-400 font-bold';
    return 'text-red-400';
  };

  return (
    <Card 
      className={cn(
        "p-4 backdrop-blur-sm bg-purple-900/10 border-purple-500/20 hover:border-purple-500/40 transition-all duration-500",
        className,
        {
          'border-green-500/20 hover:border-green-500/40': priceData.price_change_percentage_24h > 0,
          'border-red-500/20 hover:border-red-500/40': priceData.price_change_percentage_24h < 0
        }
      )}
    >
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-purple-300">{coin.toUpperCase()}/USD</h3>
        {!isLoading && !error && (
          <div className={cn(
            "flex items-center transition-colors",
            getPriceChangeColor(priceData.price_change_percentage_24h)
          )}>
            <span>{priceData.price_change_percentage_24h > 0 ? '+' : ''}{priceData.price_change_percentage_24h.toFixed(2)}%</span>
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
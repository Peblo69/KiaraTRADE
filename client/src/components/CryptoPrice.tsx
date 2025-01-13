import { Card } from "@/components/ui/card";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { connectToWebSocket } from "@/lib/websocket";
import type { BinanceTickerData } from "@/lib/websocket";

interface CryptoPriceProps {
  coin: string;
  className?: string;
}

interface PriceData {
  price: string;
  change24h: string;
}

export default function CryptoPrice({ coin, className }: CryptoPriceProps) {
  const [priceData, setPriceData] = useState<PriceData>({
    price: "0",
    change24h: "0"
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const ws = connectToWebSocket();
    const maxRetries = 5;
    const baseDelay = 1000; // Start with 1 second delay

    const handleMessage = (event: MessageEvent) => {
      try {
        const data: BinanceTickerData = JSON.parse(event.data);
        if (data.symbol === coin) {
          setPriceData({
            price: data.price,
            change24h: data.change24h
          });
          setIsLoading(false);
          setError(null);
          setRetryCount(0); // Reset retry count on successful update
        }
      } catch (err) {
        console.error('Error parsing WebSocket message:', err);

        if (retryCount < maxRetries) {
          // Exponential backoff
          const delay = baseDelay * Math.pow(2, retryCount);
          setTimeout(() => {
            setRetryCount(prev => prev + 1);
            // Attempt to reconnect
            connectToWebSocket();
          }, delay);

          setError(`Retrying... (${retryCount + 1}/${maxRetries})`);
        } else {
          setError('Unable to update price data');
        }
      }
    };

    ws.addEventListener('message', handleMessage);

    // Reset states when coin changes
    setIsLoading(true);
    setError(null);
    setRetryCount(0);

    return () => {
      ws.removeEventListener('message', handleMessage);
    };
  }, [coin, retryCount]); // Include retryCount in dependencies

  // Dynamic color classes based on price change
  const getPriceChangeColor = (change: string) => {
    const changeNum = parseFloat(change);
    if (changeNum > 5) return 'text-green-400 font-bold';
    if (changeNum > 0) return 'text-green-400';
    if (changeNum < -5) return 'text-red-400 font-bold';
    return 'text-red-400';
  };

  return (
    <Card 
      className={cn(
        "p-4 backdrop-blur-sm bg-purple-900/10 border-purple-500/20 hover:border-purple-500/40 transition-all transform duration-500",
        className,
        {
          'border-green-500/20 hover:border-green-500/40': parseFloat(priceData.change24h) > 0,
          'border-red-500/20 hover:border-red-500/40': parseFloat(priceData.change24h) < 0
        }
      )}
    >
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-purple-300">{coin.toUpperCase()}/USD</h3>
        {!isLoading && !error && parseFloat(priceData.price) > 0 && (
          <div className={cn(
            "flex items-center transition-colors",
            getPriceChangeColor(priceData.change24h)
          )}>
            <span>
              {parseFloat(priceData.change24h) > 0 ? '+' : ''}
              {parseFloat(priceData.change24h).toFixed(2)}%
            </span>
          </div>
        )}
      </div>
      <div className="mt-2">
        {isLoading ? (
          <div className="h-8 bg-purple-500/20 animate-pulse rounded" />
        ) : error ? (
          <div className="text-red-400 text-sm">
            {error}
            <div className="h-1 bg-purple-500/20 mt-1 overflow-hidden">
              <div 
                className="h-full bg-purple-500 transition-all duration-300" 
                style={{ width: `${(retryCount / 5) * 100}%` }}
              />
            </div>
          </div>
        ) : parseFloat(priceData.price) > 0 ? (
          <div className="text-2xl font-bold">
            {new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: 'USD',
              minimumFractionDigits: parseFloat(priceData.price) < 1 ? 6 : 2,
              maximumFractionDigits: parseFloat(priceData.price) < 1 ? 6 : 2
            }).format(parseFloat(priceData.price))}
          </div>
        ) : (
          <div className="h-8 bg-purple-500/20 animate-pulse rounded" />
        )}
      </div>
    </Card>
  );
}
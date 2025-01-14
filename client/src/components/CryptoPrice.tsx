import { Card } from "@/components/ui/card";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";

interface CryptoPriceProps {
  coin: string;
  className?: string;
}

interface PriceData {
  price: number;
  change24h: number;
}

export default function CryptoPrice({ coin, className }: CryptoPriceProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["/api/market/overview"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const formatNumber = (num: number) => {
    if (num >= 1e12) return `$${(num / 1e12).toFixed(2)}T`;
    if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
    return `$${num.toLocaleString()}`;
  };

  // Get the relevant price data based on the coin
  const getPriceData = () => {
    if (!data) return null;

    switch (coin.toLowerCase()) {
      case 'bitcoin':
        return {
          price: data.market_cap.value * (data.btc_dominance / 100),
          change24h: data.market_cap.change_24h
        };
      case 'ethereum':
        return {
          price: data.market_cap.value * (data.eth_dominance / 100),
          change24h: data.market_cap.change_24h
        };
      case 'solana':
        // For Solana, we'll use a percentage of ETH market cap as an approximation
        return {
          price: data.market_cap.value * (data.eth_dominance / 100) * 0.1,
          change24h: data.market_cap.change_24h
        };
      default:
        return null;
    }
  };

  const priceData = getPriceData();

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
        "p-4 backdrop-blur-sm bg-purple-900/10 border-purple-500/20 hover:border-purple-500/40 transition-all transform duration-500",
        className,
        {
          'border-green-500/20 hover:border-green-500/40': priceData && priceData.change24h > 0,
          'border-red-500/20 hover:border-red-500/40': priceData && priceData.change24h < 0
        }
      )}
    >
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-purple-300">{coin.toUpperCase()}/USD</h3>
        {!isLoading && !error && priceData && (
          <div className={cn(
            "flex items-center transition-colors",
            getPriceChangeColor(priceData.change24h)
          )}>
            <span>
              {priceData.change24h > 0 ? '+' : ''}
              {priceData.change24h.toFixed(2)}%
            </span>
          </div>
        )}
      </div>
      <div className="mt-2">
        {isLoading ? (
          <div className="h-8 bg-purple-500/20 animate-pulse rounded" />
        ) : error ? (
          <div className="text-red-400 text-sm">
            Error loading price data
          </div>
        ) : priceData ? (
          <div className="text-2xl font-bold">
            {formatNumber(priceData.price)}
          </div>
        ) : (
          <div className="h-8 bg-purple-500/20 animate-pulse rounded" />
        )}
      </div>
    </Card>
  );
}
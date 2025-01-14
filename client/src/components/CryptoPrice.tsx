import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface CryptoPriceProps {
  coin: string;
  className?: string;
}

const mockPriceData = {
  bitcoin: { price: 45000, change24h: 2.5 },
  ethereum: { price: 2500, change24h: -1.2 },
  solana: { price: 150, change24h: 5.8 }
};

export default function CryptoPrice({ coin, className }: CryptoPriceProps) {
  const priceData = mockPriceData[coin.toLowerCase()];

  const formatNumber = (num: number) => {
    return `$${num.toLocaleString()}`;
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
        {priceData && (
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
        {priceData ? (
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
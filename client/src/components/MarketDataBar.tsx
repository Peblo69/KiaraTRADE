import { FC, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Circle } from "lucide-react";

interface MarketData {
  data: {
    ticker: Array<{
      symbol: string;
      last: string;
      changeRate: string;
      volValue: string;
    }>;
  };
}

const MarketDataBar: FC = () => {
  const { data, isLoading } = useQuery<MarketData>({
    queryKey: ['/api/coins/markets'],
    refetchInterval: 60000, // Refresh every minute
  });

  const formatPrice = (price: string | number) => {
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: numPrice < 1 ? 4 : 2,
      maximumFractionDigits: numPrice < 1 ? 6 : 2,
    }).format(numPrice);
  };

  const formatVolume = (volume: string | number) => {
    const num = typeof volume === 'string' ? parseFloat(volume) : volume;
    if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
    if (num >= 1e3) return `$${(num / 1e3).toFixed(2)}K`;
    return num.toFixed(2);
  };

  const formatChange = (change: string) => {
    const numChange = parseFloat(change);
    return `${numChange >= 0 ? '+' : ''}${(numChange * 100).toFixed(2)}%`;
  };

  if (isLoading || !data?.data) {
    return (
      <div className="w-full bg-black/50 backdrop-blur-sm border-b border-purple-800/20 py-1">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-center h-8">
            <span className="text-purple-400">Loading market data...</span>
          </div>
        </div>
      </div>
    );
  }

  const tickers = data.data.ticker.filter(t => t.symbol.endsWith('-USDT'));
  const totalVolume = tickers.reduce((sum, t) => sum + parseFloat(t.volValue), 0);
  const topGainers = [...tickers]
    .sort((a, b) => parseFloat(b.changeRate) - parseFloat(a.changeRate))
    .slice(0, 3);
  const topLosers = [...tickers]
    .sort((a, b) => parseFloat(a.changeRate) - parseFloat(b.changeRate))
    .slice(0, 3);

  const MarketInfo = () => (
    <div className="inline-flex items-center gap-4 px-4">
      <div className="text-gray-400 px-2">
        24h Volume: <span className="text-white">{formatVolume(totalVolume)}</span>
      </div>

      <Circle className="h-1.5 w-1.5 text-purple-500/50" />

      <div className="text-gray-400 px-2">
        Top Gainers:{" "}
        {topGainers.map((t, i) => (
          <span key={t.symbol} className={i !== 0 ? "ml-2" : ""}>
            <span className="text-white">{t.symbol.replace('-USDT', '')}</span>
            <span className="text-green-400 ml-1">{formatChange(t.changeRate)}</span>
          </span>
        ))}
      </div>

      <Circle className="h-1.5 w-1.5 text-purple-500/50" />

      <div className="text-gray-400 px-2">
        Top Losers:{" "}
        {topLosers.map((t, i) => (
          <span key={t.symbol} className={i !== 0 ? "ml-2" : ""}>
            <span className="text-white">{t.symbol.replace('-USDT', '')}</span>
            <span className="text-red-400 ml-1">{formatChange(t.changeRate)}</span>
          </span>
        ))}
      </div>

      <Circle className="h-1.5 w-1.5 text-purple-500/50" />

      <div className="text-gray-400 px-2">
        Market Leaders:{" "}
        {tickers
          .filter(t => ['BTC-USDT', 'ETH-USDT'].includes(t.symbol))
          .map((t, i) => (
            <span key={t.symbol} className={i !== 0 ? "ml-2" : ""}>
              <span className="text-white">{t.symbol.replace('-USDT', '')}</span>
              <span className={`ml-1 ${parseFloat(t.changeRate) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {formatChange(t.changeRate)}
              </span>
            </span>
          ))}
      </div>
    </div>
  );

  return (
    <div className="w-full bg-black/50 backdrop-blur-sm border-b border-purple-800/20 py-1 overflow-hidden">
      <div className="relative hover:pause-animation">
        <div className="animate-marquee whitespace-nowrap">
          <MarketInfo />
          <MarketInfo /> {/* Duplicate content for seamless loop */}
        </div>
      </div>
    </div>
  );
};

export default MarketDataBar;
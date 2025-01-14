import { FC } from "react";
import { useQuery } from "@tanstack/react-query";

interface MarketData {
  total_coins: number;
  total_exchanges: number;
  market_cap: {
    value: number;
    change_24h: number;
  };
  volume_24h: number;
  btc_dominance: number;
  eth_dominance: number;
  gas_price: number;
}

const MarketDataBar: FC = () => {
  const { data, isLoading } = useQuery<MarketData>({
    queryKey: ["/api/market/overview"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const formatNumber = (num: number) => {
    if (num >= 1e12) return `$${(num / 1e12).toFixed(2)}T`;
    if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
    return `$${num.toLocaleString()}`;
  };

  if (isLoading) {
    return (
      <div className="w-full bg-black/50 backdrop-blur-sm border-b border-purple-800/20 py-1">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-8 text-sm text-gray-400">
            <div className="animate-pulse bg-purple-500/20 h-4 w-24 rounded"></div>
            <div className="animate-pulse bg-purple-500/20 h-4 w-24 rounded"></div>
            <div className="animate-pulse bg-purple-500/20 h-4 w-32 rounded"></div>
            <div className="animate-pulse bg-purple-500/20 h-4 w-28 rounded"></div>
            <div className="animate-pulse bg-purple-500/20 h-4 w-20 rounded"></div>
            <div className="animate-pulse bg-purple-500/20 h-4 w-20 rounded"></div>
            <div className="animate-pulse bg-purple-500/20 h-4 w-24 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-black/50 backdrop-blur-sm border-b border-purple-800/20 py-1">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-8 text-sm">
          <div className="text-gray-400">
            Coins: <span className="text-white">{data?.total_coins.toLocaleString()}</span>
          </div>
          <div className="text-gray-400">
            Exchanges: <span className="text-white">{data?.total_exchanges.toLocaleString()}</span>
          </div>
          <div className="text-gray-400">
            Market Cap:{" "}
            <span className={`${data?.market_cap.change_24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {formatNumber(data?.market_cap.value || 0)}{" "}
              {data?.market_cap.change_24h >= 0 ? "▲" : "▼"}{" "}
              {Math.abs(data?.market_cap.change_24h || 0).toFixed(1)}%
            </span>
          </div>
          <div className="text-gray-400">
            24h Vol: <span className="text-white">{formatNumber(data?.volume_24h || 0)}</span>
          </div>
          <div className="text-gray-400">
            BTC: <span className="text-white">{data?.btc_dominance.toFixed(1)}%</span>
          </div>
          <div className="text-gray-400">
            ETH: <span className="text-white">{data?.eth_dominance.toFixed(1)}%</span>
          </div>
          <div className="text-gray-400">
            Gas: <span className="text-white">{data?.gas_price.toFixed(1)} GWEI</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MarketDataBar;

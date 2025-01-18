import { FC, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";

interface GlobalData {
  data: {
    active_cryptocurrencies: number;
    markets: number;
    total_market_cap: {
      usd: number;
    };
    market_cap_change_percentage_24h_usd: number;
    total_volume: {
      usd: number;
    };
    market_cap_percentage: {
      btc: number;
      eth: number;
    };
  };
}

const MarketDataBar: FC = () => {
  const { data, isLoading } = useQuery<GlobalData>({
    queryKey: ['/api/global-metrics'],
    refetchInterval: 60000, // Refresh every minute
  });

  const formatNumber = (num: number) => {
    if (num >= 1e12) return `$${(num / 1e12).toFixed(2)}T`;
    if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
    return `$${num.toLocaleString()}`;
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

  const marketData = data.data;

  return (
    <div className="w-full bg-black/50 backdrop-blur-sm border-b border-purple-800/20 py-1">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-8 text-sm overflow-x-auto">
          <div className="text-gray-400 whitespace-nowrap">
            Coins: <span className="text-white">{marketData.active_cryptocurrencies.toLocaleString()}</span>
          </div>
          <div className="text-gray-400 whitespace-nowrap">
            Exchanges: <span className="text-white">{marketData.markets.toLocaleString()}</span>
          </div>
          <div className="text-gray-400 whitespace-nowrap">
            Market Cap:{" "}
            <span className={`${marketData.market_cap_change_percentage_24h_usd >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {formatNumber(marketData.total_market_cap.usd)}{" "}
              {marketData.market_cap_change_percentage_24h_usd >= 0 ? "▲" : "▼"}{" "}
              {Math.abs(marketData.market_cap_change_percentage_24h_usd).toFixed(1)}%
            </span>
          </div>
          <div className="text-gray-400 whitespace-nowrap">
            24h Vol: <span className="text-white">{formatNumber(marketData.total_volume.usd)}</span>
          </div>
          <div className="text-gray-400 whitespace-nowrap">
            BTC: <span className="text-white">{marketData.market_cap_percentage.btc.toFixed(1)}%</span>
          </div>
          <div className="text-gray-400 whitespace-nowrap">
            ETH: <span className="text-white">{marketData.market_cap_percentage.eth.toFixed(1)}%</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MarketDataBar;
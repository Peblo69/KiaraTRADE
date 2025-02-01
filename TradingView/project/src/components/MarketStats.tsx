import React from 'react';
import { BarChart2 } from 'lucide-react';
import { useTokenAnalysis } from '@/lib/helius-token-analysis';

interface Props {
  tokenAddress: string;
}

const MarketStats: React.FC<Props> = ({ tokenAddress }) => {
  const { marketData, isLoading } = useTokenAnalysis(tokenAddress);

  if (isLoading) {
    return (
      <div className="bg-[#0D0B1F] rounded-lg border border-purple-900/30 p-4 space-y-4">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-purple-900/20 rounded w-1/4"></div>
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-4 bg-purple-900/20 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!marketData) return null;

  return (
    <div className="bg-[#0D0B1F] rounded-lg border border-purple-900/30">
      <div className="p-4 border-b border-purple-900/30">
        <div className="flex items-center space-x-2">
          <BarChart2 className="w-5 h-5 text-purple-400" />
          <h2 className="text-purple-100 font-semibold">Market Stats</h2>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-purple-300">Price</span>
            <span className="text-sm font-medium text-purple-100">{marketData.price}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-purple-300">24h Change</span>
            <span className={`text-sm font-medium ${
              marketData.priceChange24h.isPositive ? 'text-green-400' : 'text-red-400'
            }`}>
              {marketData.priceChange24h.value.toFixed(2)}%
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-purple-300">Market Cap</span>
            <span className="text-sm font-medium text-purple-100">{marketData.marketCap}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-purple-300">24h Volume</span>
            <span className="text-sm font-medium text-purple-100">{marketData.volume24h}</span>
          </div>
        </div>

        <div className="border-t border-purple-900/30 pt-4 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-purple-300">Liquidity</span>
            <span className="text-sm font-medium text-purple-100">{marketData.liquidity}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-purple-300">ATH</span>
            <span className="text-sm font-medium text-purple-100">{marketData.ath}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-purple-300">ATL</span>
            <span className="text-sm font-medium text-purple-100">{marketData.atl}</span>
          </div>
        </div>

        <div className="border-t border-purple-900/30 pt-4 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-purple-300">Total Supply</span>
            <span className="text-sm font-medium text-purple-100">{marketData.totalSupply}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-purple-300">Circulating Supply</span>
            <span className="text-sm font-medium text-purple-100">{marketData.circulatingSupply}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MarketStats;
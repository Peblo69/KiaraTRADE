import React from 'react';
import { BarChart2 } from 'lucide-react';
import { useTokenAnalysis } from '@/lib/helius-token-analysis';

interface Props {
  tokenAddress: string;
}

const MarketStats: React.FC<Props> = ({ tokenAddress }) => {
  const { data, isLoading } = useTokenAnalysis(tokenAddress);

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
            <span className="text-sm text-purple-300">Market Cap</span>
            <span className="text-sm font-medium text-purple-100">
              ${data?.marketStats.marketCap.toLocaleString() ?? 'Loading...'}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-purple-300">Circulating Supply</span>
            <span className="text-sm font-medium text-purple-100">
              {data?.marketStats.circulatingSupply.toLocaleString() ?? 'Loading...'}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-purple-300">Total Supply</span>
            <span className="text-sm font-medium text-purple-100">
              {data?.marketStats.totalSupply.toLocaleString() ?? 'Loading...'}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-purple-300">Max Supply</span>
            <span className="text-sm font-medium text-purple-100">
              {data?.marketStats.maxSupply.toLocaleString() ?? 'Loading...'}
            </span>
          </div>
        </div>

        <div className="border-t border-purple-900/30 pt-4 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-purple-300">Price Change (24h)</span>
            <span className={`text-sm font-medium ${
              data?.marketStats.priceChange24h > 0 ? 'text-green-400' : 
              data?.marketStats.priceChange24h < 0 ? 'text-red-400' : 
              'text-purple-400'
            }`}>
              {data?.marketStats.priceChange24h?.toFixed(2)}%
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-purple-300">Volume (24h)</span>
            <span className="text-sm font-medium text-purple-100">
              ${data?.marketStats.volume24h.toLocaleString() ?? 'Loading...'}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-purple-300">Liquidity (24h)</span>
            <span className="text-sm font-medium text-purple-100">
              ${data?.marketStats.liquidity24h.toLocaleString() ?? 'Loading...'}
            </span>
          </div>
        </div>

        <div className="border-t border-purple-900/30 pt-4 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-purple-300">ATH</span>
            <div className="text-right">
              <div className="text-sm font-medium text-purple-100">
                ${data?.marketStats.ath.price.toLocaleString() ?? 'Loading...'}
              </div>
              <div className="text-xs text-purple-400">
                {data?.marketStats.ath.timestamp ? 
                  new Date(data.marketStats.ath.timestamp).toLocaleDateString() : 
                  'Loading...'}
              </div>
            </div>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-purple-300">ATL</span>
            <div className="text-right">
              <div className="text-sm font-medium text-purple-100">
                ${data?.marketStats.atl.price.toLocaleString() ?? 'Loading...'}
              </div>
              <div className="text-xs text-purple-400">
                {data?.marketStats.atl.timestamp ? 
                  new Date(data.marketStats.atl.timestamp).toLocaleDateString() : 
                  'Loading...'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MarketStats;
import React from 'react';
import { BarChart2 } from 'lucide-react';
import { usePumpPortalStore } from '@/lib/pump-portal-websocket';

interface Props {
  tokenAddress: string;
}

const MarketStats: React.FC<Props> = ({ tokenAddress }) => {
  const token = usePumpPortalStore(state => state.getToken(tokenAddress));
  const solPrice = usePumpPortalStore(state => state.solPrice);

  const loading = !token;

  if (loading) {
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

  if (!token) return null;

  const marketData = {
    price: token.priceInUsd?.toFixed(8) || '0',
    priceChange24h: {
      isPositive: true,
      value: 0
    },
    marketCap: (token.vTokensInBondingCurve * (token.priceInUsd || 0)).toFixed(2),
    volume24h: token.recentTrades?.reduce((sum, trade) => 
      sum + (trade.tokenAmount * (trade.priceInUsd || 0)), 0) || 0,
    liquidity: (token.vSolInBondingCurve || 0) * solPrice,
    totalSupply: token.vTokensInBondingCurve?.toString() || '0'
  };

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
            <span className="text-sm font-medium text-purple-100">${marketData.price}</span>
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
            <span className="text-sm font-medium text-purple-100">${marketData.marketCap}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-purple-300">24h Volume</span>
            <span className="text-sm font-medium text-purple-100">${marketData.volume24h.toFixed(2)}</span>
          </div>
        </div>

        <div className="border-t border-purple-900/30 pt-4 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-purple-300">Liquidity</span>
            <span className="text-sm font-medium text-purple-100">${marketData.liquidity.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-purple-300">Total Supply</span>
            <span className="text-sm font-medium text-purple-100">{marketData.totalSupply}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MarketStats;
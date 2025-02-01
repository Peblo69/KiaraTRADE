import React from 'react';
import { TrendingUp, Users, DollarSign, BarChart2 } from 'lucide-react';

const MarketStats: React.FC = () => {
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
            <span className="text-sm font-medium text-purple-100">$892.5M</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-purple-300">Circulating Supply</span>
            <span className="text-sm font-medium text-purple-100">19.2M BTC</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-purple-300">Total Supply</span>
            <span className="text-sm font-medium text-purple-100">21.0M BTC</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-purple-300">Max Supply</span>
            <span className="text-sm font-medium text-purple-100">21.0M BTC</span>
          </div>
        </div>

        <div className="border-t border-purple-900/30 pt-4 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-purple-300">Price Change (24h)</span>
            <span className="text-sm font-medium text-green-400">+2.45%</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-purple-300">Volume (24h)</span>
            <span className="text-sm font-medium text-purple-100">$1.2B</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-purple-300">Liquidity (24h)</span>
            <span className="text-sm font-medium text-purple-100">$450.8M</span>
          </div>
        </div>

        <div className="border-t border-purple-900/30 pt-4 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-purple-300">ATH</span>
            <div className="text-right">
              <div className="text-sm font-medium text-purple-100">$69,045</div>
              <div className="text-xs text-purple-400">Nov 10, 2021</div>
            </div>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-purple-300">ATL</span>
            <div className="text-right">
              <div className="text-sm font-medium text-purple-100">$67.81</div>
              <div className="text-xs text-purple-400">Jul 06, 2013</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MarketStats;
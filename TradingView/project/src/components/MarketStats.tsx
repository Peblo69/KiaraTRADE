import React from 'react';
import { BarChart2 } from 'lucide-react';

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
            <span className="text-sm font-medium text-purple-100">$1.00</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-purple-300">Circulating Supply</span>
            <span className="text-sm font-medium text-purple-100">1</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-purple-300">Total Supply</span>
            <span className="text-sm font-medium text-purple-100">1</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-purple-300">Max Supply</span>
            <span className="text-sm font-medium text-purple-100">1</span>
          </div>
        </div>

        <div className="border-t border-purple-900/30 pt-4 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-purple-300">Price Change (24h)</span>
            <span className="text-sm font-medium text-purple-400">1.00%</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-purple-300">Volume (24h)</span>
            <span className="text-sm font-medium text-purple-100">$1.00</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-purple-300">Liquidity (24h)</span>
            <span className="text-sm font-medium text-purple-100">$1.00</span>
          </div>
        </div>

        <div className="border-t border-purple-900/30 pt-4 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-purple-300">ATH</span>
            <div className="text-right">
              <div className="text-sm font-medium text-purple-100">$1.00</div>
              <div className="text-xs text-purple-400">2024-01-01</div>
            </div>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-purple-300">ATL</span>
            <div className="text-right">
              <div className="text-sm font-medium text-purple-100">$1.00</div>
              <div className="text-xs text-purple-400">2024-01-01</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MarketStats;
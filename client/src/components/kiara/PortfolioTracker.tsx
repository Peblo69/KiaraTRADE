import React from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

export function PortfolioTracker() {
  return (
    <div className="neon-border bg-kiara-dark/80 rounded-xl p-6">
      <h2 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400 mb-6">
        Portfolio Overview
      </h2>
      
      <div className="space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-4">
            <div className="text-purple-300 text-sm">Total Value</div>
            <div className="text-purple-100 text-xl font-semibold mt-1">$45,678.90</div>
            <div className="flex items-center text-green-400 text-sm mt-1">
              <ArrowUpRight size={16} />
              2.4%
            </div>
          </div>
          <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-4">
            <div className="text-purple-300 text-sm">24h Profit/Loss</div>
            <div className="text-purple-100 text-xl font-semibold mt-1">+$1,234.56</div>
            <div className="flex items-center text-green-400 text-sm mt-1">
              <ArrowUpRight size={16} />
              3.1%
            </div>
          </div>
        </div>

        {/* Holdings List */}
        <div className="space-y-2">
          <div className="flex items-center justify-between p-3 hover:bg-purple-900/20 rounded-lg transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-yellow-400 to-yellow-600"></div>
              <div>
                <div className="text-purple-100">Bitcoin</div>
                <div className="text-purple-400 text-sm">0.45 BTC</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-purple-100">$21,234.56</div>
              <div className="text-green-400 text-sm flex items-center justify-end">
                <ArrowUpRight size={14} className="mr-1" />
                2.4%
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 hover:bg-purple-900/20 rounded-lg transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-400 to-blue-600"></div>
              <div>
                <div className="text-purple-100">Ethereum</div>
                <div className="text-purple-400 text-sm">3.2 ETH</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-purple-100">$8,765.43</div>
              <div className="text-red-400 text-sm flex items-center justify-end">
                <ArrowDownRight size={14} className="mr-1" />
                1.2%
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

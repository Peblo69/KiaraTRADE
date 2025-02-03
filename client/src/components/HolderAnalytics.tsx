import React from 'react';
import { Users, Wallet, ArrowUpRight, ArrowDownRight } from 'lucide-react';

const HolderAnalytics: React.FC = () => {
  return (
    <div className="bg-[#0D0B1F] rounded-lg border border-purple-900/30">
      <div className="p-4 border-b border-purple-900/30">
        <div className="flex items-center space-x-2">
          <Users className="w-5 h-5 text-purple-400" />
          <h2 className="text-purple-100 font-semibold">Holder Analytics</h2>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-purple-300">Total Holders</span>
            <span className="text-sm font-medium text-purple-100">0</span>
          </div>

          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <ArrowUpRight className="w-4 h-4 text-green-400" />
              <span className="text-sm text-purple-300">New (24h)</span>
            </div>
            <span className="text-sm font-medium text-green-400">+0</span>
          </div>

          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <ArrowDownRight className="w-4 h-4 text-red-400" />
              <span className="text-sm text-purple-300">Left (24h)</span>
            </div>
            <span className="text-sm font-medium text-red-400">-0</span>
          </div>
        </div>

        <div className="border-t border-purple-900/30 pt-4 space-y-3">
          <div className="text-sm text-purple-300 mb-2">Top Holders</div>
          {[1, 2, 3].map((_, i) => (
            <div key={i} className="flex justify-between items-center text-xs">
              <div className="flex items-center space-x-2">
                <Wallet className="w-3 h-3 text-purple-400" />
                <span className="text-purple-300">0x0000...0000</span>
              </div>
              <div className="text-right">
                <div className="text-purple-100">0.00</div>
                <div className="text-purple-400">0.00%</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default HolderAnalytics;
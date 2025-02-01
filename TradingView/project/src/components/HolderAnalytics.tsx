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
            <span className="text-sm font-medium text-purple-100">1,234,567</span>
          </div>
          
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <ArrowUpRight className="w-4 h-4 text-green-400" />
              <span className="text-sm text-purple-300">New (24h)</span>
            </div>
            <span className="text-sm font-medium text-green-400">+1,234</span>
          </div>
          
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <ArrowDownRight className="w-4 h-4 text-red-400" />
              <span className="text-sm text-purple-300">Left (24h)</span>
            </div>
            <span className="text-sm font-medium text-red-400">-234</span>
          </div>
        </div>

        <div className="border-t border-purple-900/30 pt-4 space-y-3">
          <div className="text-sm text-purple-300 mb-2">Top Holders</div>
          {[
            { address: '0x1234...5678', amount: '1,234.56 BTC', percentage: '0.89%' },
            { address: '0x8765...4321', amount: '987.65 BTC', percentage: '0.45%' },
            { address: '0x9876...1234', amount: '765.43 BTC', percentage: '0.32%' },
          ].map((holder, i) => (
            <div key={i} className="flex justify-between items-center text-xs">
              <div className="flex items-center space-x-2">
                <Wallet className="w-3 h-3 text-purple-400" />
                <span className="text-purple-300">{holder.address}</span>
              </div>
              <div className="text-right">
                <div className="text-purple-100">{holder.amount}</div>
                <div className="text-purple-400">{holder.percentage}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default HolderAnalytics;
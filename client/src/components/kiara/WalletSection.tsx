import React from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

export function WalletSection() {
  return (
    <div className="relative group">
      <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl blur opacity-25 group-hover:opacity-40 transition duration-1000"></div>
      <div className="relative neon-border bg-kiara-dark/80 rounded-xl p-6">
      <h2 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400 mb-6">
        Wallet Overview
      </h2>

      <div className="space-y-4">
        <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-4 hover:bg-purple-900/30 transition-all duration-300">
          <div className="flex justify-between items-center mb-2">
            <span className="text-purple-300">Total Balance</span>
            <span className="text-purple-100 font-semibold animate-fade-in">$45,678.90</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-purple-300">24h Change</span>
            <span className="text-green-400 flex items-center gap-1">
              <ArrowUpRight size={16} className="animate-bounce" />
              +$1,234.56 (2.7%)
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <button className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-500 transition-all duration-300 hover:scale-105 transform">
            Deposit
          </button>
          <button className="bg-purple-900/20 text-purple-300 px-4 py-2 rounded-lg border border-purple-500/30 hover:bg-purple-900/30 transition-all duration-300 hover:scale-105 transform">
            Withdraw
          </button>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center p-3 hover:bg-purple-900/20 rounded-lg transition-all duration-300 group cursor-pointer">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-400 to-purple-600 group-hover:scale-110 transition-transform duration-300"></div>
              <div>
                <div className="text-purple-100">Wallet 1</div>
                <div className="text-purple-400 text-sm">Main Account</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-purple-100">$32,456.78</div>
              <div className="text-green-400 text-sm flex items-center justify-end">
                <ArrowUpRight size={14} className="mr-1" />
                +1.2%
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center p-3 hover:bg-purple-900/20 rounded-lg transition-all duration-300 group cursor-pointer">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-400 to-blue-600 group-hover:scale-110 transition-transform duration-300"></div>
              <div>
                <div className="text-purple-100">Wallet 2</div>
                <div className="text-purple-400 text-sm">Trading Account</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-purple-100">$13,222.12</div>
              <div className="text-red-400 text-sm flex items-center justify-end">
                <ArrowDownRight size={14} className="mr-1" />
                -0.5%
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
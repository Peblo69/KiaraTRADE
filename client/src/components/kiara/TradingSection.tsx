import React from 'react';
import { Activity, TrendingUp, ChevronDown } from 'lucide-react';

export function TradingSection() {
  return (
    <div className="neon-border bg-kiara-dark/80 rounded-xl p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">
          Trading Overview
        </h2>
        <div className="flex items-center gap-4">
          <select className="bg-purple-900/20 border border-purple-500/30 rounded-lg px-3 py-1 text-sm text-purple-300">
            <option>All Pairs</option>
            <option>SOL Pairs</option>
            <option>USDC Pairs</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="space-y-4 xl:col-span-2">
          <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-4">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <Activity className="text-purple-400" size={20} />
                <span className="text-purple-300">Live Trading</span>
              </div>
              <select className="bg-purple-900/20 border border-purple-500/30 rounded-lg px-2 py-1 text-xs text-purple-300">
                <option>Last 24h</option>
                <option>Last Week</option>
              </select>
            </div>

            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex justify-between items-center p-2 hover:bg-purple-900/30 rounded-lg transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-400 to-blue-400"></div>
                    <div>
                      <div className="text-purple-100">SOL/USDC</div>
                      <div className="text-purple-400 text-sm">0.5 SOL</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-green-400">+2.4%</div>
                    <div className="text-purple-300 text-sm">2 min ago</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-4">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="text-purple-400" size={20} />
                <span className="text-purple-300">Top Performers</span>
              </div>
              <ChevronDown className="text-purple-400" size={16} />
            </div>

            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-r from-green-400 to-blue-400"></div>
                    <span className="text-purple-100">TOKEN{i}</span>
                  </div>
                  <span className="text-green-400">+{i * 5}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

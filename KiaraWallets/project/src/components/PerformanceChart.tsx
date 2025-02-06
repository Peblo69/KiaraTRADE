import React from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

export function PerformanceChart() {
  return (
    <div className="neon-border bg-kiara-dark/80 rounded-xl p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">
          Trading Performance
        </h2>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="inline-block w-3 h-3 bg-purple-600 rounded-full"></span>
            <span className="text-sm text-purple-300">PNL</span>
          </div>
          <select className="bg-purple-900/20 border border-purple-500/30 rounded-lg px-3 py-1 text-sm text-purple-300">
            <option>Last 7 Days</option>
            <option>Last 30 Days</option>
            <option>Last 90 Days</option>
          </select>
        </div>
      </div>

      <div className="relative h-64 mb-6">
        <div className="absolute inset-0 flex items-end">
          <div className="w-full h-full flex items-end justify-around">
            {[65, 45, 75, 55, 85, 35, 70].map((height, i) => (
              <div
                key={i}
                className="w-8 bg-purple-600/80 rounded-t-lg hover:bg-purple-500 transition-colors"
                style={{ height: `${height}%` }}
              ></div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 bg-purple-900/20 border border-purple-500/30 rounded-lg">
          <div className="text-sm text-purple-300">Daily PNL</div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xl font-bold text-purple-100">+$1,234</span>
            <span className="text-green-400 flex items-center text-sm">
              <ArrowUpRight size={16} />
              2.4%
            </span>
          </div>
        </div>
        <div className="p-4 bg-purple-900/20 border border-purple-500/30 rounded-lg">
          <div className="text-sm text-purple-300">Weekly PNL</div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xl font-bold text-purple-100">-$567</span>
            <span className="text-red-400 flex items-center text-sm">
              <ArrowDownRight size={16} />
              1.2%
            </span>
          </div>
        </div>
        <div className="p-4 bg-purple-900/20 border border-purple-500/30 rounded-lg">
          <div className="text-sm text-purple-300">Total Value</div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xl font-bold text-purple-100">$45,678</span>
          </div>
        </div>
      </div>
    </div>
  );
}
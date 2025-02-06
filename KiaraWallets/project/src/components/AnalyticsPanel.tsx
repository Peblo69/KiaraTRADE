import React from 'react';
import { PieChart, BarChart2, Activity } from 'lucide-react';

export function AnalyticsPanel() {
  return (
    <div className="neon-border bg-kiara-dark/80 rounded-xl p-6">
      <h2 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400 mb-6">
        Analytics
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-6">
          <div className="relative aspect-square bg-purple-900/20 rounded-lg border border-purple-500/30 p-4">
            <div className="absolute inset-0 flex items-center justify-center">
              <PieChart size={120} className="text-purple-400" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-purple-200">
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 bg-purple-600 rounded-full"></span>
                PumpFun
              </span>
              <span>45%</span>
            </div>
            <div className="flex items-center justify-between text-purple-200">
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 bg-purple-400 rounded-full"></span>
                SolFun
              </span>
              <span>35%</span>
            </div>
            <div className="flex items-center justify-between text-purple-200">
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 bg-purple-200 rounded-full"></span>
                Others
              </span>
              <span>20%</span>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2 text-purple-200">
              <Activity size={20} className="text-purple-400" />
              Key Metrics
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-purple-300">Win Rate</span>
                <span className="font-semibold text-purple-100">67%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-purple-300">Avg. Trade Size</span>
                <span className="font-semibold text-purple-100">$1,234</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-purple-300">Daily Volume</span>
                <span className="font-semibold text-purple-100">$45,678</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-purple-300">Risk Score</span>
                <span className="font-semibold text-yellow-400">Medium</span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2 text-purple-200">
              <BarChart2 size={20} className="text-purple-400" />
              Volume Statistics
            </h3>
            <div className="h-32 flex items-end gap-1 bg-purple-900/20 rounded-lg border border-purple-500/30 p-4">
              {[30, 45, 25, 60, 35, 40, 50].map((height, i) => (
                <div
                  key={i}
                  className="flex-1 bg-purple-600/80 rounded-t hover:bg-purple-500 transition-colors"
                  style={{ height: `${height}%` }}
                ></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
import React from 'react';
import { ArrowLeft, User, TrendingUp, Shield } from 'lucide-react';

interface CopyTradingPageProps {
  onBack: () => void;
}

export function CopyTradingPage({ onBack }: CopyTradingPageProps) {
  return (
    <div className="p-6">
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={onBack}
          className="p-2 rounded-lg bg-purple-900/20 text-purple-400 hover:bg-purple-900/30"
        >
          <ArrowLeft size={20} />
        </button>
        <h2 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">
          Copy Trading
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-4">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-400 to-blue-400 flex items-center justify-center">
                  <User className="text-white" size={20} />
                </div>
                <div>
                  <div className="text-purple-100 font-medium">Trader {i}</div>
                  <div className="text-purple-400 text-sm">@trader{i}</div>
                </div>
              </div>
              <button className="px-3 py-1 text-xs rounded-md bg-purple-600 text-white hover:bg-purple-500">
                Copy
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-purple-900/40 rounded-lg p-3">
                <div className="text-purple-300 text-sm mb-1">Win Rate</div>
                <div className="text-green-400 font-medium flex items-center gap-1">
                  <TrendingUp size={14} />
                  {85 + i}%
                </div>
              </div>
              <div className="bg-purple-900/40 rounded-lg p-3">
                <div className="text-purple-300 text-sm mb-1">Risk Level</div>
                <div className="text-yellow-400 font-medium flex items-center gap-1">
                  <Shield size={14} />
                  Medium
                </div>
              </div>
            </div>

            <div className="text-sm text-purple-300">
              Last 30 days performance:
              <span className="text-green-400 ml-2">+{12 + i * 5}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

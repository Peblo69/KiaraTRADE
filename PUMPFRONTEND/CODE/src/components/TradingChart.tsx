import React, { useState } from 'react';
import { LineChart, Sparkles } from 'lucide-react';

const TradingChart: React.FC = () => {
  const [selectedTimeFrame, setSelectedTimeFrame] = useState('60'); // Default to 1m

  const timeFrames = [
    { label: '1s', value: '1' },
    { label: '15s', value: '15' },
    { label: '1m', value: '60' },
    { label: '30m', value: '1800' },
    { label: '1h', value: '3600' },
    { label: '1d', value: '86400' }
  ];

  return (
    <div className="relative bg-[#0D0B1F] rounded-lg p-4 border border-purple-900/30">
      <div className="absolute inset-0 bg-gradient-to-b from-purple-900/10 to-transparent pointer-events-none" />
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <LineChart className="w-5 h-5 text-purple-400" />
          <h2 className="text-purple-100 font-semibold">Price Chart</h2>
        </div>
        <div className="flex space-x-2">
          {timeFrames.map(({ label, value }) => (
            <button
              key={value}
              className={`px-3 py-1 rounded ${
                selectedTimeFrame === value
                  ? 'bg-purple-600 text-white'
                  : 'bg-purple-900/20 text-purple-300 hover:bg-purple-900/40'
              } transition-colors`}
              onClick={() => setSelectedTimeFrame(value)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="h-[300px] flex items-center justify-center">
        <div className="text-purple-400 flex items-center space-x-2">
          <Sparkles className="w-5 h-5 animate-pulse" />
          <span>Chart visualization will be integrated here</span>
        </div>
      </div>
    </div>
  );
};

export default TradingChart;
import React from 'react';
import { Filter, Settings2, Globe, ExternalLink } from 'lucide-react';

export function AboutToGraduate() {
  const tokens = [
    { name: 'Venice', time: '1h', stats: { holders: '28%', buys: '1%' } },
    { name: 'Truth', time: '3h', stats: { holders: '1%', buys: '0%' } }
  ];

  const handleIconClick = (action: string, token: string) => {
    console.log(`${action} clicked for ${token}`);
  };

  return (
    <div className="about-to-graduate rounded-lg">
      <div className="p-4 border-b border-[#1F2937]/10 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <div className="w-5 h-5 rounded-full bg-yellow-500/40" />
          <span className="font-medium">About to Graduate</span>
        </div>
        <button 
          onClick={() => handleIconClick('filter', 'all')}
          className="hover:bg-[#2D3748]/10 p-1 rounded-md transition-colors"
        >
          <Filter className="w-5 h-5" />
        </button>
      </div>

      <div className="p-4 space-y-4">
        {tokens.map((token, index) => (
          <div key={index} className="token-card p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-[#2D3748]/10 rounded-lg flex items-center justify-center">
                  <span className="text-[#10B981]">B</span>
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">{token.name}</span>
                    <button 
                      onClick={() => handleIconClick('settings', token.name)}
                      className="hover:bg-[#374151]/10 p-1 rounded-md transition-colors"
                    >
                      <Settings2 className="w-4 h-4 text-gray-400" />
                    </button>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-gray-400">
                    <span>{token.time}</span>
                    <span>{token.stats.holders}</span>
                    <span>{token.stats.buys}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {[
                  { icon: Globe, action: 'globe' },
                  { icon: ExternalLink, action: 'external' }
                ].map((item, i) => (
                  <button
                    key={i}
                    onClick={() => handleIconClick(item.action, token.name)}
                    className="hover:bg-[#374151]/10 p-1 rounded-md transition-colors"
                  >
                    <item.icon className="w-4 h-4" />
                  </button>
                ))}
                <div className="text-right">
                  <div className="flex items-center space-x-2">
                    <span>509</span>
                    <span>V $394K</span>
                  </div>
                  <div className="text-sm text-gray-400">
                    MC $100K
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
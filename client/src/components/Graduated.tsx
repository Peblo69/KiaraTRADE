import React from 'react';
import { Filter, Settings2, Globe, Twitter, Send } from 'lucide-react';
import { PillIcon } from './PillIcon';

export function Graduated() {
  const tokens = [
    { name: '360', fullName: 'Chat360', time: '2m', stats: { holders: '34%', buys: '4%' } },
    { name: 'DB', fullName: 'Donut burger', time: '3m', stats: { holders: '21%', buys: '0%' } }
  ];

  const handleIconClick = (action: string, token: string) => {
    console.log(`${action} clicked for ${token}`);
  };

  return (
    <div className="graduated rounded-lg">
      <div className="p-4 border-b border-[#1F2937]/10 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <div className="w-5 h-5 rounded-full bg-green-500/40" />
          <span className="font-medium">Graduated</span>
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
                <div className="w-16 h-16 bg-[#2D3748]/10 rounded-lg flex items-center justify-center">
                  <div className="w-full h-full bg-[#1F2937]/20 rounded-lg"></div>
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">{token.name}</span>
                    <span className="text-sm text-gray-400">{token.fullName}</span>
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
              <div className="flex flex-col items-end space-y-2">
                <div className="flex items-center space-x-2">
                  <div className="flex space-x-1">
                    <button className="hover:bg-[#374151]/10 p-1 rounded-md transition-colors">
                      <Twitter className="w-4 h-4" />
                    </button>
                    <button className="hover:bg-[#374151]/10 p-1 rounded-md transition-colors">
                      <Send className="w-4 h-4" />
                    </button>
                    <button className="hover:bg-[#374151]/10 p-1 rounded-md transition-colors">
                      <Globe className="w-4 h-4" />
                    </button>
                    <button className="hover:bg-[#374151]/10 p-1 rounded-md transition-colors">
                      <PillIcon />
                    </button>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center space-x-2">
                    <span>449</span>
                    <span>V $179K</span>
                  </div>
                  <div className="text-sm text-gray-400">
                    MC $139K
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

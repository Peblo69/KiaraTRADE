import React from 'react';
import { Settings2, Search, Star, ArrowDownUp, Zap, BarChart2, Settings, History } from 'lucide-react';

export function Header() {
  return (
    <header className="px-4 py-2 bg-[#2D1B4C]/10 backdrop-blur-xl border-b border-[#40E0D0]/5">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Zap className="w-5 h-5 text-[#40E0D0]" />
            <span className="font-orbitron font-bold text-[#40E0D0]">Kiara Vision</span>
          </div>
          
          <div className="flex space-x-2">
            <button className="cosmic-button bg-[#2D1B4C]/10">All Chains</button>
            <button className="cosmic-button bg-[#2D1B4C]/10 flex items-center space-x-1">
              <img src="https://cryptologos.cc/logos/solana-sol-logo.png" className="w-4 h-4" alt="Solana" />
              <span>SOLANA</span>
            </button>
            <button className="cosmic-button bg-[#2D1B4C]/10 flex items-center space-x-1">
              <img src="https://cryptologos.cc/logos/tron-trx-logo.png" className="w-4 h-4" alt="TRON" />
              <span>TRON</span>
            </button>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Search"
              className="bg-[#2D1B4C]/5 border border-[#40E0D0]/5 rounded-md px-3 py-1 pl-8 text-sm focus:border-[#40E0D0]/10 focus:ring-1 focus:ring-[#40E0D0]/10 transition-all"
            />
            <Search className="w-4 h-4 absolute left-2 top-1/2 transform -translate-y-1/2 text-[#40E0D0]" />
          </div>
          
          <div className="flex items-center space-x-2">
            <button className="cosmic-icon">
              <BarChart2 className="w-5 h-5" />
            </button>
            <button className="cosmic-icon">
              <Settings2 className="w-5 h-5" />
            </button>
            <div className="cosmic-button bg-[#2D1B4C]/10">
              <span className="text-sm">3</span>
              <span className="ml-2 text-sm">Dexes</span>
            </div>
            <button className="cosmic-button bg-[#40E0D0]/40 text-[#2D1B4C] hover:bg-[#40E0D0]/30 flex items-center">
              <Zap className="w-4 h-4 mr-1" />
              BUY
            </button>
            <div className="flex items-center space-x-1 text-[#40E0D0]">
              <span className="text-sm">0</span>
              <span className="text-sm">$</span>
            </div>
            <button className="cosmic-button bg-[#2D1B4C]/10 flex items-center space-x-1">
              <BarChart2 className="w-4 h-4" />
              <span className="text-sm">Advanced</span>
            </button>
            <button className="cosmic-icon">
              <History className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
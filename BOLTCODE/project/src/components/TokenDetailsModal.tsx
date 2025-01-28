import React, { useState, useCallback } from 'react';
import { TokenData } from '../types/token';
import { 
  ChevronDown,
  Settings2,
  ArrowRight,
  Wallet,
  Camera,
  Settings,
  Search,
  History
} from 'lucide-react';

interface TokenDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  token: TokenData;
}

export function TokenDetailsModal({ isOpen, onClose, token }: TokenDetailsModalProps) {
  const [selectedTimeframe, setSelectedTimeframe] = useState('5M');
  const [selectedTab, setSelectedTab] = useState('Orders');
  const [amount, setAmount] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Market trades data
  const marketTrades = [
    { age: '8s', type: 'S', price: '0.6787$', total: '0.07045', maker: 'vMFgsm3' },
    { age: '9s', type: 'B', price: '0.6696$', total: '0.4942', maker: 'gbV1H42H' },
    { age: '14s', type: 'S', price: '0.6626$', total: '0.1757', maker: 'vMFgsm3' },
    { age: '21s', type: 'S', price: '0.6749$', total: '0.3782', maker: 'gbV1H42H' },
    { age: '25s', type: 'S', price: '0.6874$', total: '0.1886', maker: 'vMFgsm3' },
    { age: '27s', type: 'S', price: '0.6922$', total: '0.03157', maker: 'gbV1H42H' }
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#0A0A0F] text-gray-200">
      <div className="flex flex-col h-screen">
        {/* Top Section */}
        <div className="flex border-b border-gray-800">
          {/* Chart Controls */}
          <div className="flex items-center space-x-1 p-2">
            {['1s', '5s', '1m', '5m', '15m', '1h', '4h'].map(tf => (
              <button 
                key={tf}
                className={`px-2 py-1 text-xs rounded ${
                  selectedTimeframe === tf 
                    ? 'bg-[#1F2937] text-white' 
                    : 'text-gray-400 hover:bg-[#1F2937]'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>

          {/* Right Controls */}
          <div className="ml-auto flex items-center space-x-2 p-2">
            <button className="text-xs px-2 py-1 bg-[#1F2937] rounded flex items-center space-x-1">
              <span>Default</span>
              <ChevronDown className="w-3 h-3" />
            </button>
            <button className="p-1 hover:bg-[#1F2937] rounded">
              <Settings2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex flex-1 min-h-0">
          {/* Chart Area */}
          <div className="flex-1 bg-[#0A0A0F] border-r border-gray-800">
            {/* Chart will be rendered here */}
          </div>

          {/* Trading Panel */}
          <div className="w-[320px] flex flex-col">
            {/* Market/Limit Toggle */}
            <div className="p-3 border-b border-gray-800">
              <div className="flex justify-between mb-4">
                <button className="text-[#40E0D0] text-sm">Market</button>
                <button className="text-gray-400 text-sm">Limit</button>
              </div>

              {/* Amount Input */}
              <div className="space-y-2">
                <input
                  type="text"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-[#1F2937] rounded p-2 text-right"
                  placeholder="0"
                />
                <div className="grid grid-cols-4 gap-1">
                  {['0.01', '0.02', '0.5', '1'].map(preset => (
                    <button
                      key={preset}
                      className="bg-[#1F2937] py-1 rounded text-xs"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Gas Settings */}
              <div className="flex items-center justify-between mt-3 text-xs">
                <span className="text-gray-400">Gas ~</span>
                <div className="flex items-center space-x-2">
                  <span>0.01</span>
                  <span className="text-gray-400">30%</span>
                  <span className="text-[#40E0D0]">0.01000</span>
                  <ArrowRight className="w-3 h-3" />
                </div>
              </div>

              {/* Add Funds Button */}
              <button className="w-full bg-[#1F2937] py-2 rounded mt-3 text-sm">
                Add Funds
              </button>

              {/* Advanced Settings */}
              <button className="w-full flex items-center justify-between mt-3 text-xs text-gray-400">
                <span>Advanced Sell</span>
                <ChevronDown className="w-3 h-3" />
              </button>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-800 px-3 py-2">
              <div className="flex space-x-4">
                {['Orders', 'Trades', 'Holders', 'Top Traders', 'Positions', 'History'].map(tab => (
                  <button
                    key={tab}
                    className={`text-xs ${selectedTab === tab ? 'text-[#40E0D0]' : 'text-gray-400'}`}
                    onClick={() => setSelectedTab(tab)}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {/* Market Trades */}
            <div className="flex-1 overflow-auto">
              <div className="px-3 py-2">
                <div className="flex justify-between items-center text-xs text-gray-400 mb-2">
                  <span>Market Trades</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-[#40E0D0]">91</span>
                    <span className="text-red-500">74</span>
                    <span>5M</span>
                  </div>
                </div>

                {/* Trades List */}
                <div className="space-y-1">
                  {marketTrades.map((trade, index) => (
                    <div key={index} className="flex justify-between text-xs">
                      <div className="flex items-center space-x-2">
                        <span className="text-gray-400">{trade.age}</span>
                        <span className={trade.type === 'B' ? 'text-[#40E0D0]' : 'text-red-500'}>
                          {trade.type}
                        </span>
                        <span>{trade.price}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span>{trade.total}</span>
                        <span className="text-gray-400">{trade.maker}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
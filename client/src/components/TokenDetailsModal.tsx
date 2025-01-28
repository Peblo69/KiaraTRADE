import React, { useState } from 'react';
import { TokenData } from '../types/token';
import { 
  ChevronDown,
  Settings2,
  ArrowRight,
  Camera,
  Settings,
  RefreshCcw,
  ChevronRight,
  Bell,
  Zap,
  Star,
  MousePointer,
  Move,
  LineChart,
  BarChart,
  List,
  Type,
  Target,
  Crosshair
} from 'lucide-react';

interface TokenDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  token: TokenData;
}

export function TokenDetailsModal({ isOpen, onClose, token }: TokenDetailsModalProps) {
  const [selectedTimeframe, setSelectedTimeframe] = useState('1s');
  const [selectedTab, setSelectedTab] = useState('Orders');
  const [orderType, setOrderType] = useState<'Market' | 'Limit'>('Market');
  const [amount, setAmount] = useState('');

  const marketTrades = [
    { age: '12s', type: 'S', price: '0.6653$', total: '0.7800', maker: 'vMFgsm3' },
    { age: '16s', type: 'B', price: '0.6401$', total: '0.4000', maker: 'gbV1H42H' },
    { age: '16s', type: 'B', price: '0.6653$', total: '0.7800', maker: 'vMFgsm3' }
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#0A0A0F] text-gray-200">
      {/* Top Navigation Bar */}
      <div className="flex items-center justify-between px-4 py-1.5 border-b border-gray-800">
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1">
            <img src="https://via.placeholder.com/24" className="w-6 h-6 rounded-full" alt="Token" />
            <span className="text-sm font-medium">TOT</span>
            <span className="text-xs text-gray-400">Trip Out</span>
          </div>
          <div className="flex items-center space-x-4 ml-4">
            <div className="text-sm">
              <span className="text-gray-400">Price</span>
              <div>$0.4475</div>
            </div>
            <div className="text-sm">
              <span className="text-gray-400">Mkt Cap</span>
              <div>$4.48K</div>
            </div>
            <div className="text-sm">
              <span className="text-gray-400">Liquidity</span>
              <div>$6.86K</div>
            </div>
            <div className="text-sm">
              <span className="text-gray-400">B.Curve</span>
              <div className="text-green-400">1.78%</div>
            </div>
            <div className="text-sm">
              <span className="text-gray-400">Audit</span>
              <div className="flex items-center space-x-1">
                <span className="text-green-400">Safe</span>
                <span>8/8</span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button className="p-1 hover:bg-gray-800 rounded">
            <Bell className="w-4 h-4" />
          </button>
          <button className="p-1 hover:bg-gray-800 rounded">
            <Star className="w-4 h-4" />
          </button>
          <button className="px-2 py-0.5 bg-gray-800 rounded text-xs">
            Positions
          </button>
          <button className="flex items-center space-x-1 px-2 py-0.5 bg-green-800 rounded text-xs">
            <Zap className="w-3 h-3" />
            <span>@RobertDerm</span>
          </button>
        </div>
      </div>

      {/* Chart Controls */}
      <div className="flex items-center space-x-2 px-4 py-1 border-b border-gray-800">
        <div className="flex space-x-0.5">
          {['1s', '5s', '1m', '5m', '15m', '1h', '4h'].map(tf => (
            <button 
              key={tf}
              onClick={() => setSelectedTimeframe(tf)}
              className={`px-2 py-0.5 text-xs rounded ${
                selectedTimeframe === tf 
                  ? 'bg-gray-800 text-white' 
                  : 'text-gray-400 hover:bg-gray-800'
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
        <button className="px-2 py-0.5 text-xs text-gray-400 hover:bg-gray-800 rounded">
          Indicators
        </button>
        <button className="px-2 py-0.5 text-xs text-gray-400 hover:bg-gray-800 rounded">
          Hide My Trades
        </button>
        <button className="px-2 py-0.5 text-xs text-gray-400 hover:bg-gray-800 rounded">
          Price / MCap
        </button>
        <button className="px-2 py-0.5 text-xs text-gray-400 hover:bg-gray-800 rounded">
          Bubble Map
        </button>
        <button className="px-2 py-0.5 text-xs text-gray-400 hover:bg-gray-800 rounded">
          Hide Dev Trades
        </button>
        <button className="px-2 py-0.5 text-xs text-gray-400 hover:bg-gray-800 rounded">
          Reset Chart Data
        </button>
        <div className="ml-auto flex items-center space-x-2">
          <button className="flex items-center space-x-1 px-2 py-0.5 bg-gray-800 rounded text-xs">
            <span>Save</span>
            <ChevronDown className="w-3 h-3" />
          </button>
          <button className="p-1 hover:bg-gray-800 rounded">
            <Camera className="w-4 h-4" />
          </button>
          <button className="p-1 hover:bg-gray-800 rounded">
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 min-h-0">
        {/* Left Toolbar */}
        <div className="w-8 border-r border-gray-800 bg-[#0A0A0F]">
          <div className="flex flex-col items-center py-2 space-y-3">
            <button className="p-1 hover:bg-gray-800 rounded">
              <MousePointer className="w-4 h-4" />
            </button>
            <button className="p-1 hover:bg-gray-800 rounded">
              <Move className="w-4 h-4" />
            </button>
            <button className="p-1 hover:bg-gray-800 rounded">
              <LineChart className="w-4 h-4" />
            </button>
            <button className="p-1 hover:bg-gray-800 rounded">
              <BarChart className="w-4 h-4" />
            </button>
            <button className="p-1 hover:bg-gray-800 rounded">
              <List className="w-4 h-4" />
            </button>
            <button className="p-1 hover:bg-gray-800 rounded">
              <Type className="w-4 h-4" />
            </button>
            <button className="p-1 hover:bg-gray-800 rounded">
              <Target className="w-4 h-4" />
            </button>
            <button className="p-1 hover:bg-gray-800 rounded">
              <Crosshair className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Chart Area */}
        <div className="flex-1 bg-[#0A0A0F]">
          <div className="flex items-center px-4 py-1 border-b border-gray-800">
            <div className="flex items-center space-x-2">
              <span className="text-xs">TOT • 1s • BULLX</span>
              <div className="text-xs text-gray-400">
                O<span className="text-green-400">6.4K</span> H6.65K L6.65K C<span className="text-green-400">6.65K</span>
                <span className="text-green-400 ml-2">+3.93%</span>
              </div>
            </div>
          </div>
          <div className="w-full h-[calc(100vh-280px)]">
            {/* TradingView chart would be rendered here */}
          </div>
          
          {/* Market Trades */}
          <div className="border-t border-gray-800">
            <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800">
              <div className="flex items-center space-x-4">
                <button className="text-[#40E0D0] text-xs">Orders</button>
                <button className="text-gray-400 text-xs">Trades</button>
                <button className="text-gray-400 text-xs">Holders (2)</button>
                <button className="text-gray-400 text-xs">Top Traders</button>
                <button className="text-gray-400 text-xs">Positions</button>
                <button className="text-gray-400 text-xs">History</button>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-green-400 text-xs">B2</span>
                <span className="text-red-400 text-xs">1S</span>
                <button className="text-gray-400 text-xs">5M</button>
                <span className="text-gray-400 text-xs">Orders</span>
                <button className="text-gray-400 text-xs hover:bg-gray-800 px-2 py-0.5 rounded">
                  Advanced Order +
                </button>
              </div>
            </div>
            
            <div className="px-4 py-2">
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

        {/* Trading Panel */}
        <div className="w-[320px] flex flex-col bg-[#0A0A0F] border-l border-gray-800">
          <div className="flex border-b border-gray-800">
            <button className="flex-1 px-4 py-1.5 text-green-400 border-b-2 border-green-400">Buy</button>
            <button className="flex-1 px-4 py-1.5 text-gray-400">Sell</button>
          </div>

          <div className="flex border-b border-gray-800">
            <button className="flex-1 px-4 py-1.5 text-[#40E0D0]">Market</button>
            <button className="flex-1 px-4 py-1.5 text-gray-400">Limit</button>
          </div>

          <div className="p-4 space-y-3">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span>AMOUNT</span>
                <span>0</span>
              </div>
              <input
                type="text"
                className="w-full bg-gray-800 rounded p-2 text-right text-sm"
                placeholder="0"
              />
              <div className="grid grid-cols-4 gap-1 mt-2">
                {['0.01', '0.02', '0.5', '1'].map(preset => (
                  <button
                    key={preset}
                    className="bg-gray-800 py-1 rounded text-xs hover:bg-gray-700"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400">Gas ~</span>
              <div className="flex items-center space-x-2">
                <span>0.01</span>
                <span className="text-gray-400">30%</span>
                <span className="text-[#40E0D0]">0.01000</span>
                <ArrowRight className="w-3 h-3" />
              </div>
            </div>

            <button className="w-full bg-gray-800 py-1.5 rounded text-sm hover:bg-gray-700">
              Add Funds
            </button>

            <button className="w-full flex items-center justify-between text-xs text-gray-400">
              <span>Advanced Sell</span>
              <ChevronDown className="w-3 h-3" />
            </button>
          </div>

          {/* Stats Section */}
          <div className="mt-auto border-t border-gray-800">
            <div className="flex border-b border-gray-800">
              <button className="flex-1 px-4 py-1.5 text-[#40E0D0] text-xs">Stats</button>
              <button className="flex-1 px-4 py-1.5 text-gray-400 text-xs">Checks</button>
              <button className="flex-1 px-4 py-1.5 text-gray-400 text-xs">My Position</button>
            </div>

            <div className="p-4">
              <div className="grid grid-cols-4 gap-2 text-xs mb-4">
                <div className="text-center">
                  <div className="text-green-400">+1%</div>
                  <div className="text-gray-400">5M</div>
                </div>
                <div className="text-center">
                  <div className="text-green-400">+1%</div>
                  <div className="text-gray-400">1H</div>
                </div>
                <div className="text-center">
                  <div className="text-green-400">+1%</div>
                  <div className="text-gray-400">6H</div>
                </div>
                <div className="text-center">
                  <div className="text-green-400">+1%</div>
                  <div className="text-gray-400">24H</div>
                </div>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-400">Txns</span>
                  <div className="flex items-center space-x-4">
                    <span>3</span>
                    <span className="text-green-400">2</span>
                    <span className="text-red-400">1</span>
                  </div>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Volume</span>
                  <div className="flex items-center space-x-4">
                    <span>$442.91</span>
                    <span>$266.65</span>
                    <span>$176.26</span>
                  </div>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Makers</span>
                  <div className="flex items-center space-x-4">
                    <span>2</span>
                    <span>2</span>
                    <span>1</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

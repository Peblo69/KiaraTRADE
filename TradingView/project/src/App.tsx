import React from 'react';
import { TradingProvider } from './context/TradingContext';
import TradingForm from './components/TradingForm';
import TradeHistory from './components/TradeHistory';
import TopBar from './components/TopBar';
import MarketStats from './components/MarketStats';
import HolderAnalytics from './components/HolderAnalytics';
import SocialMetrics from './components/SocialMetrics';

function App() {
  return (
    <TradingProvider>
      <div className="min-h-screen bg-[#070510] text-white">
        {/* Stars background effect */}
        <div className="fixed inset-0 pointer-events-none">
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full bg-white"
              style={{
                width: Math.random() * 3 + 'px',
                height: Math.random() * 3 + 'px',
                top: Math.random() * 100 + '%',
                left: Math.random() * 100 + '%',
                opacity: Math.random() * 0.5 + 0.25,
                animation: `twinkle ${Math.random() * 4 + 2}s infinite`
              }}
            />
          ))}
        </div>

        <TopBar />

        <div className="container mx-auto px-4">
          <div className="grid grid-cols-12 gap-4">
            {/* Left Column - Market Stats & Social Metrics */}
            <div className="col-span-2 space-y-4">
              <MarketStats tokenAddress="your-token-address" />
              <SocialMetrics tokenAddress="your-token-address" />
            </div>

            {/* Main Trading Area */}
            <div className="col-span-7 space-y-4">
              {/* Chart removed temporarily */}
              <div className="bg-[#0D0B1F] rounded-lg p-4 border border-purple-900/30">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <h2 className="text-purple-100 font-semibold">
                      Chart Coming Soon
                    </h2>
                  </div>
                </div>
                <div className="h-[500px] w-full flex items-center justify-center text-purple-400">
                  Implementing clean price chart...
                </div>
              </div>
              <TradeHistory tokenAddress="your-token-address" />
            </div>

            {/* Right Column - Trading Form & Holder Analytics */}
            <div className="col-span-3 space-y-4">
              <TradingForm tokenAddress="your-token-address" />
              <HolderAnalytics tokenAddress="your-token-address" />
            </div>
          </div>
        </div>
      </div>
    </TradingProvider>
  );
}

export default App;
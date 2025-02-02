import React from 'react';
import { TradingProvider } from './context/TradingContext';
import TradingForm from './components/TradingForm';
import TradeHistory from './components/TradeHistory';
import TopBar from './components/TopBar';
import MarketStats from './components/MarketStats';
import HolderAnalytics from './components/HolderAnalytics';
import SocialMetrics from './components/SocialMetrics';
import MarketCapChart from './components/MarketCapChart';

function App() {
  return (
    <TradingProvider>
      <div className="min-h-screen bg-[#070510] text-white">
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
              {/* Market Cap Chart */}
              <div className="bg-[#0D0B1F] rounded-lg p-4 border border-purple-900/30">
                <MarketCapChart tokenAddress="your-token-address" />
              </div>

              {/* Trade History */}
              <div className="bg-[#0D0B1F] rounded-lg p-4 border border-purple-900/30">
                <TradeHistory tokenAddress="your-token-address" />
              </div>
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
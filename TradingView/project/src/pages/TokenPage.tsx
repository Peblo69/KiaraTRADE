import React from 'react';
import TopBar from '@/components/TopBar';
import TradingChart from '@/components/TradingChart';
import TradingForm from '@/components/TradingForm';
import TradeHistory from '@/components/TradeHistory';
import MarketStats from '@/components/MarketStats';
import HolderAnalytics from '@/components/HolderAnalytics';
import SocialMetrics from '@/components/SocialMetrics';

interface Props {
  tokenAddress: string;
}

const TokenPage: React.FC<Props> = ({ tokenAddress }) => {
  return (
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

      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-12 gap-4">
          {/* Left Column - Market Stats & Social Metrics */}
          <div className="col-span-2 space-y-4">
            <MarketStats tokenAddress={tokenAddress} />
            <SocialMetrics tokenAddress={tokenAddress} />
          </div>

          {/* Main Trading Area */}
          <div className="col-span-7 space-y-4">
            <TradingChart tokenAddress={tokenAddress} />
            <TradeHistory tokenAddress={tokenAddress} />
          </div>

          {/* Right Column - Trading Form & Holder Analytics */}
          <div className="col-span-3 space-y-4">
            <TradingForm tokenAddress={tokenAddress} />
            <HolderAnalytics tokenAddress={tokenAddress} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default TokenPage;
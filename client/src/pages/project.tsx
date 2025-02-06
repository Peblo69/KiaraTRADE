import React from 'react';
import TopBar from '../../TradingView/project/src/components/TopBar';
import MarketStats from '../../TradingView/project/src/components/MarketStats';
import TradingForm from '../../TradingView/project/src/components/TradingForm';
import TradeHistory from '../../TradingView/project/src/components/TradeHistory';
import OrderBook from '../../TradingView/project/src/components/OrderBook';
import SocialMetrics from '../../TradingView/project/src/components/SocialMetrics';
import HolderAnalytics from '../../TradingView/project/src/components/HolderAnalytics';
import TradingChart from '../../TradingView/project/src/components/TradingChart';

const ProjectPage = () => {
  return (
    <div className="min-h-screen bg-[#070510]">
      <TopBar />
      <div className="container mx-auto px-4 py-4">
        <div className="grid grid-cols-12 gap-4">
          {/* Left Column */}
          <div className="col-span-2 space-y-4">
            <MarketStats />
            <SocialMetrics />
          </div>

          {/* Center Column */}
          <div className="col-span-7 space-y-4">
            <TradingChart />
            <TradeHistory tokenAddress="demo-token-address" />
          </div>

          {/* Right Column */}
          <div className="col-span-3 space-y-4">
            <TradingForm />
            <OrderBook />
            <HolderAnalytics />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectPage;
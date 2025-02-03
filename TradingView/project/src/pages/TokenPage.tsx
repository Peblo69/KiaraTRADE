import React from 'react';
import TopBar from '../components/TopBar';
import MarketStats from '../components/MarketStats';
import TradingForm from '../components/TradingForm';
import TradeHistory from '../components/TradeHistory';
import OrderBook from '../components/OrderBook';
import SocialMetrics from '../components/SocialMetrics';
import HolderAnalytics from '../components/HolderAnalytics';

const TokenPage = () => {
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
            {/* TradingView Chart will go here */}
            <div className="h-[500px] bg-[#0D0B1F] rounded-lg border border-purple-900/30">
              <div id="tradingview-widget-container" />
            </div>
            <TradeHistory />
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

export default TokenPage;
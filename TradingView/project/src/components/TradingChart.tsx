
import React from 'react';
import { usePumpPortalStore } from '../lib/pump-portal-websocket';

const TradingChart = () => {
  return (
    <div className="bg-[#0D0B1F] rounded-lg border border-purple-900/30 p-4">
      <div className="h-[500px]">
        <div id="tradingview_widget" className="h-full" />
      </div>
    </div>
  );
};

export default TradingChart;

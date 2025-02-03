import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { TradingProvider } from './context/TradingContext';
import TradingChart from './components/TradingChart';
import TradingForm from './components/TradingForm';
import TradeHistory from './components/TradeHistory';
import TopBar from './components/TopBar';
import MarketStats from './components/MarketStats';
import HolderAnalytics from './components/HolderAnalytics';
import SocialMetrics from './components/SocialMetrics';
import TokenPage from './components/TokenPage'; // Import TokenPage
import TokenDetails from './components/TokenDetails'; // Import TokenDetails


function App() {
  return (
    <TradingProvider>
      <Router>
        <div className="min-h-screen bg-[#070510]">
          <Routes>
            <Route path="/" element={<TokenPage />} />
            <Route path="/token/:tokenAddress" element={<TokenDetails />} />
          </Routes>
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
                <MarketStats />
                <SocialMetrics />
              </div>

              {/* Main Trading Area */}
              <div className="col-span-7 space-y-4">
                <TradingChart />
                <TradeHistory />
              </div>

              {/* Right Column - Trading Form & Holder Analytics */}
              <div className="col-span-3 space-y-4">
                <TradingForm />
                <HolderAnalytics />
              </div>
            </div>
          </div>
        </div>
      </Router>
    </TradingProvider>
  );
}

export default App;
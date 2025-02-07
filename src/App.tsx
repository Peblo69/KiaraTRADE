import React from 'react';
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { queryClient } from "./lib/queryClient";
import { TradingProvider } from './context/TradingContext';
import { WalletDashboard } from './components/wallet/WalletDashboard';
import { Route } from 'wouter';
import { TopBar } from './components/TopBar';
import { KiaraVideo } from './components/KiaraVideo';
import { SpaceBackground } from './components/SpaceBackground';
import { AiChat } from './components/AiChat';
import { TokenPage } from './components/TokenPage';
import { TokenDetails } from './components/TokenDetails';
import { MarketStats } from './components/MarketStats';
import { SocialMetrics } from './components/SocialMetrics';
import { TradingChart } from './components/TradingChart';
import { TradeHistory } from './components/TradeHistory';
import { TradingForm } from './components/TradingForm';
import { HolderAnalytics } from './components/HolderAnalytics';

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TradingProvider>
        <div className="min-h-screen bg-[#0B0B1E] grid-bg">
          <SpaceBackground />
          <TopBar />

          <main>
            <Route path="/" component={TokenPage} />
            <Route path="/token/:tokenAddress" component={TokenDetails} />
            <Route path="/wallet" component={WalletDashboard} />
            <Route path="/trading">
              {() => (
                <div className="container mx-auto px-4 py-6">
                  <div className="grid grid-cols-12 gap-4">
                    <div className="col-span-2 space-y-4">
                      <MarketStats />
                      <SocialMetrics />
                    </div>
                    <div className="col-span-7 space-y-4">
                      <TradingChart />
                      <TradeHistory />
                    </div>
                    <div className="col-span-3 space-y-4">
                      <TradingForm />
                      <HolderAnalytics />
                    </div>
                  </div>
                </div>
              )}
            </Route>
          </main>

          <KiaraVideo />
          <AiChat />
          <Toaster />
        </div>
      </TradingProvider>
    </QueryClientProvider>
  );
}

export default App;
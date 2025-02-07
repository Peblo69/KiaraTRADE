import React from 'react';
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Route } from 'wouter';

// Feature Components
import { KiaraVideo } from './components/features/KiaraVideo';
import { SpaceBackground } from './components/features/SpaceBackground';
import { AiChat } from './components/features/AiChat';

// Layout Components
import { TopBar } from './components/layout/TopBar';

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-[#0B0B1E] grid-bg">
        <SpaceBackground />
        <TopBar />

        <main>
          <Route path="/">
            <div className="container mx-auto px-4 py-6">
              <KiaraVideo />
            </div>
          </Route>
          {/*The following routes are removed based on the edited code, but may need to be re-added if the intention changes.*/}
          {/*<Route path="/token/:tokenAddress" component={TokenDetails} />
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
          </Route>*/}
        </main>

        <AiChat />
        {/* <Toaster /> This is removed as per the edited code. */}
      </div>
    </QueryClientProvider>
  );
}

export default App;
import React from 'react';
import PumpFunVision from './pages/pumpfun-vision';
import { initializeHeliusWebSocket } from './lib/helius-websocket';
import { useUnifiedTokenStore } from './lib/unified-token-store';
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Project from "@/pages/project";
import KiaraStageI from "@/pages/kiara-stage-i";
import About from "@/pages/about";
import Landing from "@/pages/landing";
import CryptoNews from "@/pages/crypto-news";
import Predictions from "@/pages/predictions";
import WalletTracking from "@/pages/wallet-tracking";
import TokenMonitor from "@/pages/token-monitor";
import { WalletContextProvider } from "@/lib/wallet";
import MarketDataBar from "@/components/MarketDataBar";
import Navbar from "@/components/Navbar";
import { useLocation } from "wouter";

function Router() {
  const [location] = useLocation();
  const isLandingPage = location === "/";

  return (
    <div className="min-h-screen bg-background">
      {!isLandingPage && (
        <div className="fixed top-0 left-0 right-0 z-50 shadow-sm">
          <div className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border/40">
            <MarketDataBar />
          </div>
          <div className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border/40">
            <Navbar />
          </div>
        </div>
      )}

      <main className={!isLandingPage ? "pt-[120px]" : ""}>
        <Switch>
          <Route path="/" component={Landing} />
          <Route path="/home" component={Home} />
          <Route path="/crypto-news" component={CryptoNews} />
          <Route path="/project" component={Project} />
          <Route path="/kiara-stage-i" component={KiaraStageI} />
          <Route path="/about" component={About} />
          <Route path="/pumpfun-vision" component={PumpFunVision} />
          <Route path="/predictions" component={Predictions} />
          <Route path="/wallet-tracking" component={WalletTracking} />
          <Route path="/token-monitor" component={TokenMonitor} />
          <Route component={NotFound} />
        </Switch>
      </main>
    </div>
  );
}

const App: React.FC = () => {
  const setConnected = useUnifiedTokenStore(state => state.setConnected);

  React.useEffect(() => {
    initializeHeliusWebSocket();
    return () => {
      setConnected(false);
    };
  }, []);

  return (
    <WalletContextProvider>
      <QueryClientProvider client={queryClient}>
        <Router />
        <Toaster />
      </QueryClientProvider>
    </WalletContextProvider>
  );
};

export default App;
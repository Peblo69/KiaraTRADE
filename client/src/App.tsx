import React from 'react';
import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { useLocation } from "wouter";
import { TradingProvider } from '@/context/TradingContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';

// Import fonts
import "@fontsource/orbitron";
import "@fontsource/exo-2";

// Components
import PumpFunVision from './pages/pumpfun-vision';
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Project from "@/pages/project";
import KiaraStageI from "@/pages/kiara-stage-i";
import About from "@/pages/about";
import Landing from "@/pages/landing";
import CryptoNews from "@/pages/crypto-news";
import Predictions from "@/pages/predictions";
import WalletTracking from "@/pages/wallet-tracking";
import MarketDataBar from "@/components/MarketDataBar";
import Navbar from "@/components/Navbar";

// Store and Services
import { initializeHeliusWebSocket } from './lib/helius-websocket';
import { useUnifiedTokenStore } from './lib/unified-token-store';
import { queryClient } from "./lib/queryClient";
import { WalletContextProvider } from "@/lib/wallet";
import { wsManager } from '@/lib/websocket-manager';
import { usePumpPortalStore } from '@/lib/pump-portal-websocket';

function Router() {
  const [location] = useLocation();
  const isLandingPage = location === "/";

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      {!isLandingPage && (
        <div className="fixed top-0 left-0 right-0 z-50 shadow-sm">
          <div className="bg-[#111111]/95 backdrop-blur supports-[backdrop-filter]:bg-[#111111]/60 border-b border-purple-500/20">
            <MarketDataBar />
          </div>
          <div className="bg-[#111111]/95 backdrop-blur supports-[backdrop-filter]:bg-[#111111]/60 border-b border-purple-500/20">
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
          <Route component={NotFound} />
        </Switch>
      </main>
    </div>
  );
}

const App: React.FC = () => {
  const setConnected = useUnifiedTokenStore(state => state.setConnected);

  React.useEffect(() => {
    let heliusInitialized = false;

    const initializeConnections = async () => {
      try {
        await initializeHeliusWebSocket();
        heliusInitialized = true;
        console.log('[App] Helius WebSocket initialized');

        wsManager.connect();
        console.log('[App] PumpPortal WebSocket initialized');

        usePumpPortalStore.setState({ isConnected: true });
      } catch (error) {
        console.error('[App] Error initializing connections:', error);
        setConnected(false);
      }
    };

    const initTimeout = setTimeout(initializeConnections, 1000);

    return () => {
      clearTimeout(initTimeout);
      if (heliusInitialized) setConnected(false);
      wsManager.disconnect();
      usePumpPortalStore.setState({ isConnected: false });
    };
  }, [setConnected]);

  return (
    <ErrorBoundary>
      <WalletContextProvider>
        <QueryClientProvider client={queryClient}>
          <TradingProvider>
            <Router />
            <Toaster />
          </TradingProvider>
        </QueryClientProvider>
      </WalletContextProvider>
    </ErrorBoundary>
  );
};

export default App;
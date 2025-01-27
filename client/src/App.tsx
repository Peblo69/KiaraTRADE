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
import { WalletContextProvider } from "@/lib/wallet";
import MarketDataBar from "@/components/MarketDataBar";
import Navbar from "@/components/Navbar";
import { useLocation } from "wouter";
import { format } from 'date-fns';
import { wsManager, getCurrentUTCTime, getCurrentUser } from '@/lib/websocket-manager';
import { usePumpPortalStore } from '@/lib/pump-portal-websocket';

// Constants
const UPDATE_INTERVAL = 1000; // 1 second interval for time updates
const INITIAL_CONNECTION_DELAY = 1000; // 1 second delay for initial connection

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
          <Route component={NotFound} />
        </Switch>
      </main>
    </div>
  );
}

const App: React.FC = () => {
  const setConnected = useUnifiedTokenStore(state => state.setConnected);
  const updateTimestamp = usePumpPortalStore(state => state.updateTimestamp);

  // Initialize WebSocket connections and handle cleanup
  React.useEffect(() => {
    let heliusInitialized = false;
    let timeUpdateInterval: number;

    const initializeConnections = async () => {
      try {
        // Initialize Helius WebSocket
        await initializeHeliusWebSocket();
        heliusInitialized = true;
        console.log('[App] Helius WebSocket initialized');

        // Initialize PumpPortal WebSocket
        wsManager.connect();
        console.log('[App] PumpPortal WebSocket initialized');

        // Initialize store with current user and time
        usePumpPortalStore.setState({
          currentUser: getCurrentUser(),
          currentTime: getCurrentUTCTime(),
          isConnected: true
        });

        // Set up timestamp update interval
        timeUpdateInterval = window.setInterval(() => {
          updateTimestamp();
        }, UPDATE_INTERVAL);

      } catch (error) {
        console.error('[App] Error initializing connections:', error);
        setConnected(false);
      }
    };

    // Delay initial connection to ensure proper initialization
    const initTimeout = setTimeout(() => {
      initializeConnections();
    }, INITIAL_CONNECTION_DELAY);

    // Cleanup function
    return () => {
      clearTimeout(initTimeout);

      if (heliusInitialized) {
        setConnected(false);
      }

      if (timeUpdateInterval) {
        clearInterval(timeUpdateInterval);
      }

      wsManager.disconnect();

      usePumpPortalStore.setState({
        isConnected: false,
        currentTime: getCurrentUTCTime()
      });
    };
  }, []);

  // Monitor WebSocket connection status
  React.useEffect(() => {
    const checkConnection = () => {
      const isConnected = wsManager.getStatus();
      usePumpPortalStore.setState({ isConnected });
    };

    const connectionCheck = setInterval(checkConnection, UPDATE_INTERVAL);

    return () => {
      clearInterval(connectionCheck);
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
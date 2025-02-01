import React from 'react';
import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { useLocation } from "wouter";

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

// Constants
const UPDATE_INTERVAL = 1000; // 1 second interval for time updates
const INITIAL_CONNECTION_DELAY = 1000; // 1 second delay for initial connection

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

// Error Boundary Component
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary]', { error, errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-[#0A0A0A]">
          <div className="p-4 rounded-lg border border-red-500/20 bg-red-500/10 max-w-md mx-auto">
            <h2 className="text-lg font-semibold text-red-400 mb-2">Something went wrong</h2>
            <p className="text-sm text-gray-400">
              Please refresh the page or contact support if the problem persists.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

interface PumpPortalState {
  isConnected: boolean;
  setConnected: (connected: boolean) => void;
}

const App: React.FC = () => {
  const setConnected = useUnifiedTokenStore(state => state.setConnected);

  // Initialize WebSocket connections and handle cleanup
  React.useEffect(() => {
    let heliusInitialized = false;

    const initializeConnections = async () => {
      try {
        // Initialize Helius WebSocket
        await initializeHeliusWebSocket();
        heliusInitialized = true;
        console.log('[App] Helius WebSocket initialized');

        // Initialize PumpPortal WebSocket
        wsManager.connect();
        console.log('[App] PumpPortal WebSocket initialized');

        // Initialize store connection status
        usePumpPortalStore.setState({ isConnected: true });

      } catch (error) {
        console.error('[App] Error initializing connections:', error);
        setConnected(false);
      }
    };

    // Delay initial connection
    const initTimeout = setTimeout(initializeConnections, INITIAL_CONNECTION_DELAY);

    // Cleanup function
    return () => {
      clearTimeout(initTimeout);
      if (heliusInitialized) setConnected(false);
      wsManager.disconnect();
      usePumpPortalStore.setState({ isConnected: false });
    };
  }, [setConnected]);

  // Monitor WebSocket connection status
  React.useEffect(() => {
    const checkConnection = () => {
      const isConnected = wsManager.getStatus();
      usePumpPortalStore.setState({ isConnected });
    };

    const connectionCheck = setInterval(checkConnection, UPDATE_INTERVAL);
    return () => clearInterval(connectionCheck);
  }, []);

  return (
    <ErrorBoundary>
      <WalletContextProvider>
        <QueryClientProvider client={queryClient}>
          <Router />
          <Toaster />
        </QueryClientProvider>
      </WalletContextProvider>
    </ErrorBoundary>
  );
};

export default App;
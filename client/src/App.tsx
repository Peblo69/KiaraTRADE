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
import { WalletContextProvider } from "@/lib/wallet";
import MarketDataBar from "@/components/MarketDataBar";
import Navbar from "@/components/Navbar";
import { useLocation } from "wouter";

function Router() {
  const [location] = useLocation();
  const isLandingPage = location === "/";

  return (
    <>
      {/* Navigation structure - only shown on non-landing pages */}
      {!isLandingPage && (
        <div className="bg-background">
          <MarketDataBar />
          <div className="border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <Navbar />
          </div>
        </div>
      )}

      {/* Main content */}
      <div>
        <Switch>
          {/* Landing page is the initial route */}
          <Route path="/" component={Landing} />

          {/* All other routes */}
          <Route path="/home" component={Home} />
          <Route path="/crypto-news" component={CryptoNews} />
          <Route path="/project" component={Project} />
          <Route path="/kiara-stage-i" component={KiaraStageI} />
          <Route path="/about" component={About} />
          <Route component={NotFound} />
        </Switch>
      </div>
    </>
  );
}

function App() {
  return (
    <WalletContextProvider>
      <QueryClientProvider client={queryClient}>
        <div className="min-h-screen bg-background text-foreground">
          <Router />
          <Toaster />
        </div>
      </QueryClientProvider>
    </WalletContextProvider>
  );
}

export default App;
import React from 'react';
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";

// Import all pages
import Landing from "@/pages/landing";
import Home from "@/pages/home";
import KiaraStageI from "@/pages/kiara-stage-i";
import PumpFunVision from "@/pages/pumpfun-vision";
import CryptoNews from "@/pages/crypto-news";
import About from "@/pages/about";
import Predictions from "@/pages/predictions";
import Subscriptions from "@/pages/subscriptions";
import WalletTracking from "@/pages/wallet-tracking";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/home" component={Home} />
      <Route path="/kiara-stage-i" component={KiaraStageI} />
      <Route path="/pumpfun-vision" component={PumpFunVision} />
      <Route path="/crypto-news" component={CryptoNews} />
      <Route path="/about" component={About} />
      <Route path="/predictions" component={Predictions} />
      <Route path="/subscriptions" component={Subscriptions} />
      <Route path="/wallet-tracking" component={WalletTracking} />
      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
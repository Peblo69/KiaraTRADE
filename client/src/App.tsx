import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Home from "@/pages/home";
import About from "@/pages/about";
import CryptoNews from "@/pages/crypto-news";
import Project from "@/pages/project";
import Subscriptions from "@/pages/subscriptions";
import KiaraStageI from "@/pages/kiara-stage-i";
import PumpFunVision from "@/pages/pumpfun-vision";

function Router() {
  return (
    <Switch>
      {/* Main landing page */}
      <Route path="/" component={Landing} />

      {/* Core pages */}
      <Route path="/home" component={Home} />
      <Route path="/about" component={About} />
      <Route path="/news" component={CryptoNews} />
      <Route path="/project" component={Project} />
      <Route path="/subscriptions" component={Subscriptions} />

      {/* Feature pages */}
      <Route path="/kiara" component={KiaraStageI} />
      <Route path="/pump-vision" component={PumpFunVision} />

      {/* Fallback */}
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
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
import { Layout } from "@/components/Layout";
import { WalletContextProvider } from "@/lib/wallet";

function Router() {
  return (
    <Switch>
      {/* Landing page is the initial route */}
      <Route path="/" component={Landing} />

      {/* All other routes are wrapped in Layout */}
      <Route path="*">
        {(params) => (
          <Layout>
            <Switch>
              <Route path="/home" component={Home} />
              <Route path="/crypto-news" component={CryptoNews} />
              <Route path="/project" component={Project} />
              <Route path="/kiara-stage-i" component={KiaraStageI} />
              <Route path="/about" component={About} />
              <Route component={NotFound} />
            </Switch>
          </Layout>
        )}
      </Route>
    </Switch>
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
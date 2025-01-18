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
import { Layout } from "@/components/Layout";
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom';
import { clusterApiUrl } from '@solana/web3.js';

const network = WalletAdapterNetwork.Mainnet;
const endpoint = clusterApiUrl(network);
const wallets = [new PhantomWalletAdapter()];

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
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <QueryClientProvider client={queryClient}>
          <div className="min-h-screen bg-background text-foreground">
            <Router />
            <Toaster />
          </div>
        </QueryClientProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}

export default App;
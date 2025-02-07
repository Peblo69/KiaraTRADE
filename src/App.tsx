import React from 'react';
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { queryClient } from "./lib/queryClient";
import { TradingProvider } from './context/TradingContext';
import { WalletDashboard } from './components/wallet/WalletDashboard';

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TradingProvider>
        <div className="min-h-screen bg-[#0B0B1E] grid-bg">
          <main>
            <WalletDashboard />
          </main>
        </div>
        <Toaster />
      </TradingProvider>
    </QueryClientProvider>
  );
}

export default App;

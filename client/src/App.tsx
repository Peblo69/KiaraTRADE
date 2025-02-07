import React from 'react';
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { queryClient } from "./lib/queryClient";
import { TradingProvider } from './context/TradingContext';
import { WalletDashboard } from './components/wallet/WalletDashboard';
import { Bell, Menu, Search, Zap } from 'lucide-react';

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TradingProvider>
        <div className="min-h-screen bg-[#0B0B1E] grid-bg">
          {/* Header */}
          <header className="neon-border bg-[#0B0B1E]/90 backdrop-blur-md border-b border-purple-500/20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center h-16">
                <div className="flex items-center">
                  <button className="lg:hidden p-2 rounded-md text-purple-400 hover:text-purple-300 hover:bg-purple-500/10">
                    <Menu size={24} />
                  </button>
                  <div className="flex-shrink-0 flex items-center">
                    <img
                      src="https://images.unsplash.com/photo-1614854262318-831574f15f1f?auto=format&fit=crop&w=40&h=40"
                      alt="Kiara Vision"
                      className="h-8 w-8 rounded-full"
                    />
                    <span className="ml-2 text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">
                      Kiara Vision
                    </span>
                  </div>
                </div>

                <div className="flex-1 max-w-xl px-8 hidden lg:flex">
                  <div className="w-full relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Search className="h-5 w-5 text-purple-400" />
                    </div>
                    <input
                      type="text"
                      className="block w-full pl-10 pr-3 py-2 bg-purple-900/10 border border-purple-500/20 rounded-lg 
                               text-purple-100 placeholder-purple-400/50 focus:outline-none focus:border-purple-500/50
                               focus:ring-1 focus:ring-purple-500/30"
                      placeholder="Search tokens..."
                    />
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <button className="p-2 rounded-md text-purple-400 hover:text-purple-300 hover:bg-purple-500/10">
                    <Bell size={24} />
                  </button>
                </div>
              </div>
            </div>
          </header>

          {/* Main Content */}
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
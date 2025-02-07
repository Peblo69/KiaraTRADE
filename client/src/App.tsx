import { FC } from 'react';
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { queryClient } from "./lib/queryClient";
import { TokenStats } from '@/components/TokenStats';
import { MarketStats } from '@/components/trading/MarketStats';
import { Bell, Menu } from 'lucide-react';

const App: FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
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
                  <span className="ml-2 text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">
                    PumpVision
                  </span>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <TokenStats />
            <MarketStats />
          </div>
        </main>
        <Toaster />
      </div>
    </QueryClientProvider>
  );
};

export default App;
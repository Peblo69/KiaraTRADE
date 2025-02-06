import React from 'react';
import { WalletSection } from '@/components/kiara/WalletSection';
import { PortfolioTracker } from '@/components/kiara/PortfolioTracker';
import { PerformanceChart } from '@/components/kiara/PerformanceChart';
import { AnalyticsPanel } from '@/components/kiara/AnalyticsPanel';
import { CopyTradingPage } from '@/components/kiara/CopyTradingPage';
import { TradingSection } from '@/components/kiara/TradingSection';
import { Bell, Menu, Search, Zap } from 'lucide-react';

function ProjectPage() {
  const [showCopyTrading, setShowCopyTrading] = React.useState(false);

  return (
    <div className="min-h-screen bg-[#0B0B1E]">
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
                  className="h-8 w-8 rounded-full neon-glow"
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
              <button
                onClick={() => setShowCopyTrading(true)}
                className="cyber-button flex items-center gap-2"
              >
                <Zap size={18} className="text-yellow-400" />
                Copy Trading
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="space-y-8">
          {/* Top Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <WalletSection />
            <PortfolioTracker />
          </div>

          {/* Middle Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <PerformanceChart />
            <AnalyticsPanel />
          </div>

          {/* Bottom Row */}
          <div className="grid grid-cols-1 gap-8">
            <TradingSection />
            {showCopyTrading && (
              <div className="neon-border bg-kiara-dark/80 rounded-xl">
                <CopyTradingPage onBack={() => setShowCopyTrading(false)} />
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none">
        {[...Array(50)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white"
            style={{
              width: Math.random() * 3 + 'px',
              height: Math.random() * 3 + 'px',
              top: Math.random() * 100 + '%',
              left: Math.random() * 100 + '%',
              opacity: Math.random() * 0.5 + 0.25,
              animation: `twinkle ${Math.random() * 4 + 2}s infinite`
            }}
          />
        ))}
      </div>
    </div>
  );
}

export default ProjectPage;
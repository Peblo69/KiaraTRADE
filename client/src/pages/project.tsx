import React from 'react';
import { Bell, Menu, Search } from 'lucide-react';
import { WalletSection } from '@/components/kiara/WalletSection';
import { PortfolioTracker } from '@/components/kiara/PortfolioTracker';

function ProjectPage() {
  return (
    <div className="min-h-screen bg-[#0B0B1E] grid-bg">
      {/* Enhanced Header with Glass Effect */}
      <header className="sticky top-0 z-50 backdrop-blur-md border-b border-purple-500/20 bg-[#0B0B1E]/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <button className="lg:hidden p-2 rounded-md text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 transition-colors">
                <Menu size={24} />
              </button>
              <div className="flex-shrink-0 flex items-center group">
                <div className="relative">
                  <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full blur opacity-50 group-hover:opacity-75 transition duration-1000"></div>
                  <img
                    src="https://images.unsplash.com/photo-1614854262318-831574f15f1f?auto=format&fit=crop&w=40&h=40"
                    alt="Kiara Vision"
                    className="relative h-8 w-8 rounded-full"
                  />
                </div>
                <span className="ml-2 text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400 animate-gradient">
                  Kiara Vision
                </span>
              </div>
            </div>

            <div className="flex-1 max-w-xl px-8 hidden lg:flex">
              <div className="w-full relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-purple-400 group-hover:text-purple-300 transition-colors" />
                </div>
                <input
                  type="text"
                  className="block w-full pl-10 pr-3 py-2 bg-purple-900/10 border border-purple-500/20 rounded-lg 
                           text-purple-100 placeholder-purple-400/50 focus:outline-none focus:border-purple-500/50
                           focus:ring-1 focus:ring-purple-500/30 transition-all duration-200"
                  placeholder="Search tokens..."
                />
              </div>
            </div>

            <div className="flex items-center gap-4">
              <button className="relative p-2 rounded-md text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 transition-all duration-200">
                <Bell size={24} />
                <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-purple-500 animate-pulse"></span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content with Enhanced Grid Layout */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in">
          <WalletSection />
          <PortfolioTracker />
        </div>
      </main>
    </div>
  );
}

export default ProjectPage;
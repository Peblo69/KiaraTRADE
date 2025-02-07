import React from 'react';
import { Bell, Menu } from 'lucide-react';
import { WalletSetup } from '@/components/wallet/WalletSetup';
import { WalletDashboard } from '@/components/wallet/WalletDashboard';

function ProjectPage() {
  const hasWallet = false; // TODO: Replace with actual wallet check

  return (
    <div className="min-h-screen bg-[#0B0B1E] grid-bg">
      {/* Header */}
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

            <div className="flex items-center gap-4">
              <button className="relative p-2 rounded-md text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 transition-all duration-200">
                <Bell size={24} />
                <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-purple-500 animate-pulse"></span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {!hasWallet ? (
          <WalletSetup />
        ) : (
          <WalletDashboard />
        )}
      </main>
    </div>
  );
}

export default ProjectPage;
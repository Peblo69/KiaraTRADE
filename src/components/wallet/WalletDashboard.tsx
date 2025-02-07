import React, { useState } from 'react';
import { CreateWallet } from './CreateWallet';
import { ImportWallet } from './ImportWallet';
import { TradingSection } from '../TradingSection';
import { MarketContext } from '../MarketContext';

interface WalletDashboardProps {
  onBack?: () => void;
}

export function WalletDashboard({ onBack }: WalletDashboardProps) {
  const [showCreateWallet, setShowCreateWallet] = useState(false);
  const [showImportWallet, setShowImportWallet] = useState(false);

  // Mock data - will be replaced with real data from context
  const hasWallet = false;

  if (!hasWallet) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-6">
        <div className="max-w-md w-full space-y-4">
          <button
            onClick={() => setShowCreateWallet(true)}
            className="w-full bg-purple-600 text-white px-4 py-3 rounded-lg hover:bg-purple-500 transition-all duration-300 hover:scale-105 transform"
          >
            Create New Wallet
          </button>
          <button
            onClick={() => setShowImportWallet(true)}
            className="w-full bg-purple-900/30 text-purple-300 px-4 py-3 rounded-lg border border-purple-500/30 hover:bg-purple-900/40 transition-all duration-300 hover:scale-105 transform"
          >
            Import Existing Wallet
          </button>
        </div>
      </div>
    );
  }

  if (showCreateWallet) {
    return <CreateWallet onBack={() => setShowCreateWallet(false)} />;
  }

  if (showImportWallet) {
    return <ImportWallet onBack={() => setShowImportWallet(false)} />;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-fade-in">
      <TradingSection />
      <MarketContext 
        symbol="SOL"
        correlations={[
          { token: "BTC", correlation: 0.85 },
          { token: "ETH", correlation: 0.78 }
        ]}
        volumeAnalysis={{
          current: 1500000,
          average: 1200000,
          trend: 'up',
          unusualActivity: true
        }}
        marketDepth={{
          buyPressure: 65,
          sellPressure: 35,
          strongestSupport: 89.50,
          strongestResistance: 92.75
        }}
      />
    </div>
  );
}

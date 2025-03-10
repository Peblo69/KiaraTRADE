import React from 'react';
import { TokenCard } from './components/TokenCard';

const mockToken = {
  address: "0x1234567890abcdef",
  name: "IVANKA",
  symbol: "IVANKA",
  priceInUsd: 79,
  marketCapSol: 900000,
  solPrice: 0.1,
  vSolInBondingCurve: 230000,
  isNew: true,
  imageUrl: "https://images.unsplash.com/photo-1516245834210-c4c142787335?w=128&h=128&fit=crop",
  holdersCount: 195,
  devWalletPercentage: 0,
  top10HoldersPercentage: 35,
  snipersCount: 3,
  socials: {
    twitter: "https://twitter.com/example",
    website: "https://example.com",
    telegram: "https://t.me/example",
    pumpfun: "https://pumpfun.io/token/example"
  }
};

function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black p-8">
      <div className="max-w-md mx-auto">
        <TokenCard 
          token={mockToken}
          onClick={() => alert('Token clicked!')}
        />
      </div>
    </div>
  );
}

export default App;
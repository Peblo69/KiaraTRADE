import React, { useState } from 'react';
import { Filter, Settings2, Globe, Twitter, Send } from 'lucide-react';
import { PillIcon } from './PillIcon';
import { TokenDetailsModal } from './TokenDetailsModal';
import { usePumpPortalStore } from "@/lib/pump-portal-websocket";
import { Button } from "@/components/ui/button";
import { TokenSecurityButton } from './TokenSecurityButton';

export function AboutToGraduate() {
  const [selectedToken, setSelectedToken] = useState<any>(null);

  // Global state from PumpPortal
  const tokens = usePumpPortalStore(state => state.tokens);
  const isConnected = usePumpPortalStore(state => state.isConnected);

  // Get tokens that are 24-48 hours old
  const graduatingTokens = tokens.filter(token => {
    const createdAt = new Date(token.timestamp || Date.now());
    const now = new Date();
    const hoursDiff = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
    return hoursDiff > 24 && hoursDiff <= 48;
  });

  const handleIconClick = (e: React.MouseEvent, action: string, token: any) => {
    e.stopPropagation();
    console.log(`${action} clicked for ${token.name}`);
  };

  return (
    <div className="about-to-graduate rounded-lg">
      <div className="p-4 border-b border-[#1F2937]/10 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <div className="w-5 h-5 rounded-full bg-yellow-500/40" />
          <span className="font-medium">About to Graduate</span>
        </div>
        <Button 
          variant="ghost"
          size="icon"
          className="hover:bg-[#2D3748]/10 transition-colors"
        >
          <Filter className="w-5 h-5" />
        </Button>
      </div>

      <div className="p-4 space-y-4">
        {graduatingTokens.map((token) => (
          <div 
            key={token.address} 
            className="token-card p-3 cursor-pointer"
            onClick={() => setSelectedToken(token)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-16 h-16 bg-[#2D3748]/10 rounded-lg flex items-center justify-center">
                  {token.imageUrl ? (
                    <img 
                      src={token.imageUrl} 
                      alt={token.name} 
                      className="w-full h-full object-cover rounded-lg"
                    />
                  ) : (
                    <div className="w-full h-full bg-[#1F2937]/20 rounded-lg"></div>
                  )}
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">{token.name || token.symbol}</span>
                    <TokenSecurityButton tokenAddress={token.address} />
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-gray-400">
                    <span>{new Date(token.timestamp).toLocaleTimeString()}</span>
                    <span>{token.holders || '0'} holders</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-end space-y-2">
                <div className="flex items-center space-x-2">
                  <div className="flex space-x-1">
                    <button 
                      onClick={(e) => handleIconClick(e, 'twitter', token)}
                      className="hover:bg-[#374151]/10 p-1 rounded-md transition-colors"
                    >
                      <Twitter className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={(e) => handleIconClick(e, 'telegram', token)}
                      className="hover:bg-[#374151]/10 p-1 rounded-md transition-colors"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={(e) => handleIconClick(e, 'website', token)}
                      className="hover:bg-[#374151]/10 p-1 rounded-md transition-colors"
                    >
                      <Globe className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={(e) => handleIconClick(e, 'pumpfun', token)}
                      className="hover:bg-[#374151]/10 p-1 rounded-md transition-colors"
                    >
                      <PillIcon />
                    </button>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center space-x-2">
                    <span>{token.price?.toFixed(8) || '0.00'}</span>
                    <span>V ${token.volume?.toFixed(2) || '0.00'}</span>
                  </div>
                  <div className="text-sm text-gray-400">
                    MC ${token.marketCapSol?.toFixed(2) || '0.00'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {selectedToken && (
        <TokenDetailsModal 
          isOpen={!!selectedToken}
          onClose={() => setSelectedToken(null)}
          token={selectedToken}
        />
      )}
    </div>
  );
}
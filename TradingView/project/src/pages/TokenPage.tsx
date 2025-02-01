import React, { useState, useEffect, useRef } from 'react';
import TokenMarketStats from '@/components/TokenMarketStats';
import TradeHistory from '@/components/TradeHistory';
import { usePumpPortalStore } from '@/lib/pump-portal-websocket';

interface Props {
  tokenAddress: string;
}

const TokenPage: React.FC<Props> = ({ tokenAddress }) => {
  const [isLoading, setIsLoading] = useState(true);
  const ws = useRef<WebSocket | null>(null);
  const token = usePumpPortalStore(state => state.getToken(tokenAddress));

  useEffect(() => {
    if (!tokenAddress) return;
    console.log('🔌 Connecting to PumpPortal for:', tokenAddress);

    // Listen for WebSocket status
    wsManager.on('connected', (id) => {
      console.log('🔌 WEBSOCKET CONNECTED:', id);
      setIsLoading(false);
    });

    wsManager.on('disconnected', (id) => {
      console.log('❌ WEBSOCKET DISCONNECTED:', id);
    });

    // Handle PumpPortal updates
    wsManager.on('pumpUpdate', (data) => {
      console.log('📨 Received update:', data);
    });

    return () => {
      console.log('🔄 Cleaning up subscription for:', tokenAddress);
      wsManager.removeAllListeners('pumpUpdate');
    };
  }, [tokenAddress]);

  if (!token) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0D0B1F] text-purple-100">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Token Header */}
        <div className="flex items-center gap-4 mb-8">
          {token.imageUrl && (
            <img 
              src={token.imageUrl} 
              alt={token.name} 
              className="w-12 h-12 rounded-full"
            />
          )}
          <div>
            <h1 className="text-2xl font-bold">{token.name}</h1>
            <p className="text-purple-400">{token.symbol}</p>
          </div>
        </div>

        {/* Market Stats & Trade History */}
        <div className="grid gap-8 md:grid-cols-2">
          <div className="space-y-8">
            <div className="p-6 rounded-lg border border-purple-500/20 bg-card">
              <TokenMarketStats 
                tokenAddress={tokenAddress} 
                webSocket={ws.current}
              />
            </div>

            {/* Social Links */}
            {(token.twitter || token.telegram || token.website) && (
              <div className="p-6 rounded-lg border border-purple-500/20 bg-card">
                <h2 className="text-lg font-semibold mb-4">Links</h2>
                <div className="flex gap-4">
                  {token.twitter && (
                    <a 
                      href={`https://twitter.com/${token.twitter}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-purple-400 hover:text-purple-300"
                    >
                      Twitter
                    </a>
                  )}
                  {token.telegram && (
                    <a 
                      href={`https://t.me/${token.telegram}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-purple-400 hover:text-purple-300"
                    >
                      Telegram
                    </a>
                  )}
                  {token.website && (
                    <a 
                      href={token.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-purple-400 hover:text-purple-300"
                    >
                      Website
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Trade History */}
          <div className="p-6 rounded-lg border border-purple-500/20 bg-card">
            <TradeHistory 
              tokenAddress={tokenAddress} 
              webSocket={ws.current}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default TokenPage;
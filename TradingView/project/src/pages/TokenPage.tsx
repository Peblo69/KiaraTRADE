import React, { useState, useEffect } from 'react';
import MarketStats from '@/components/MarketStats';
import TradeHistory from '@/components/TradeHistory';
import TradingChart from '@/components/TradingChart';
import { usePumpPortalStore } from '@/lib/pump-portal-websocket';

interface Props {
  tokenAddress: string;
}

const TokenPage: React.FC<Props> = ({ tokenAddress }) => {
  const [isLoading, setIsLoading] = useState(true);
  const token = usePumpPortalStore(state => state.getToken(tokenAddress));
  const addToViewedTokens = usePumpPortalStore(state => state.addToViewedTokens);
  const setActiveTokenView = usePumpPortalStore(state => state.setActiveTokenView);

  useEffect(() => {
    console.log('TokenPage Mount:', {
      tokenAddress,
      hasToken: !!token,
      tradesCount: token?.recentTrades?.length || 0
    });

    addToViewedTokens(tokenAddress);
    setActiveTokenView(tokenAddress);
    setIsLoading(false);

    return () => setActiveTokenView(null);
  }, [tokenAddress, addToViewedTokens, setActiveTokenView]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="text-purple-400">Token not found</div>
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

        {/* Trading Chart */}
        <div className="mb-8">
          <TradingChart tokenAddress={tokenAddress} />
        </div>

        {/* Market Stats & Trade History */}
        <div className="grid gap-8 md:grid-cols-2">
          <div className="space-y-8">
            <div className="p-6 rounded-lg border border-purple-500/20 bg-card">
              <MarketStats tokenAddress={tokenAddress} />
            </div>

            {/* Social Links */}
            {(token.twitter || token.telegram || token.website) && (
              <div className="p-6 rounded-lg border border-purple-500/20 bg-card">
                <h2 className="text-lg font-semibold mb-4">Links</h2>
                <div className="flex gap-4">
                  {token.twitter && (
                    <a 
                      href={token.twitter}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-purple-400 hover:text-purple-300"
                    >
                      Twitter
                    </a>
                  )}
                  {token.telegram && (
                    <a 
                      href={token.telegram}
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
            <TradeHistory tokenAddress={tokenAddress} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default TokenPage;
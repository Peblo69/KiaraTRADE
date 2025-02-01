import React, { useEffect } from 'react';
import TokenMarketStats from '@/components/TokenMarketStats';
import TradeHistory from '@/components/TradeHistory';
import { usePumpPortalStore } from '@/lib/pump-portal-websocket';
import { setupTokenSubscription } from '@/lib/helius-websocket';
import { Loader2 } from 'lucide-react';

interface Props {
  tokenAddress: string;
}

const TokenPage: React.FC<Props> = ({ tokenAddress }) => {
  // Use useCallback to memoize the selector
  const token = React.useMemo(
    () => usePumpPortalStore.getState().getToken(tokenAddress),
    [tokenAddress]
  );

  // Set up data sources only once when tokenAddress changes
  useEffect(() => {
    if (tokenAddress && !token) {
      setupTokenSubscription(tokenAddress);
    }
  }, [tokenAddress, token]);

  // Subscribe to store updates
  useEffect(() => {
    return usePumpPortalStore.subscribe((state) => {
      const newToken = state.getToken(tokenAddress);
      if (newToken !== token) {
        // Component will re-render due to store update
      }
    });
  }, [tokenAddress, token]);

  if (!token) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="w-12 h-12 animate-spin text-purple-500" />
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
              <TokenMarketStats tokenAddress={tokenAddress} />
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
            <TradeHistory tokenAddress={tokenAddress} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(TokenPage);
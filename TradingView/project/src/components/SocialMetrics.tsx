import React from 'react';
import { Users, MessageCircle, Star, Activity } from 'lucide-react';
import { usePumpPortalStore } from '@/lib/pump-portal-websocket';

interface Props {
  tokenAddress: string;
}

const SocialMetrics: React.FC<Props> = ({ tokenAddress }) => {
  const token = usePumpPortalStore(state => state.getToken(tokenAddress));
  const isLoading = !token;

  if (isLoading) {
    return (
      <div className="bg-[#0D0B1F] rounded-lg border border-purple-900/30 p-4 space-y-4">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-purple-900/20 rounded w-1/4"></div>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-4 bg-purple-900/20 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!token) return null;

  // Calculate social metrics from token data
  const recentTrades = token.recentTrades || [];
  const uniqueTraders = new Set(recentTrades.map(t => t.traderPublicKey)).size;
  const buyCount = recentTrades.filter(t => t.type === 'buy').length;
  const sentiment = buyCount > recentTrades.length * 0.6 ? 'bullish' :
                   buyCount < recentTrades.length * 0.4 ? 'bearish' :
                   'neutral';

  return (
    <div className="bg-[#0D0B1F] rounded-lg border border-purple-900/30">
      <div className="p-4 border-b border-purple-900/30">
        <div className="flex items-center space-x-2">
          <Users className="w-5 h-5 text-purple-400" />
          <h2 className="text-purple-100 font-semibold">Social Metrics</h2>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <MessageCircle className="w-4 h-4 text-purple-400" />
              <span className="text-sm text-purple-300">Unique Traders</span>
            </div>
            <span className="text-sm font-medium text-purple-100">
              {uniqueTraders}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <Activity className="w-4 h-4 text-purple-400" />
              <span className="text-sm text-purple-300">Recent Trades</span>
            </div>
            <span className="text-sm font-medium text-purple-400">
              {recentTrades.length}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <Star className="w-4 h-4 text-purple-400" />
              <span className="text-sm text-purple-300">Sentiment</span>
            </div>
            <span className={`text-sm font-medium ${
              sentiment === 'bullish' ? 'text-green-400' :
              sentiment === 'bearish' ? 'text-red-400' :
              'text-purple-400'
            }`}>
              {sentiment}
            </span>
          </div>
        </div>

        {token.twitter && (
          <div className="border-t border-purple-900/30 pt-4">
            <div className="space-y-2">
              <div className="text-sm text-purple-300">Social Links</div>
              <div className="space-y-1">
                <a
                  href={token.twitter}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs bg-purple-900/20 text-purple-100 px-2 py-1 rounded inline-block hover:bg-purple-900/30"
                >
                  Twitter
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SocialMetrics;
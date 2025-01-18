import { FC, useEffect } from 'react';
import { useTokenStore } from '@/lib/unified-token-store';
import { pumpFunSocket } from '@/lib/pumpfun-websocket';
import TokenCard from './TokenCard';

export const TokenList: FC = () => {
  const { tokens, isConnected, error } = useTokenStore();

  useEffect(() => {
    // Connect to WebSocket when component mounts
    pumpFunSocket.connect();

    // Cleanup on unmount
    return () => {
      pumpFunSocket.disconnect();
    };
  }, []); // Empty dependency array to only run once on mount

  // Convert tokens Map to array and sort by market cap
  const sortedTokens = Array.from(tokens.values())
    .sort((a, b) => b.marketCap - a.marketCap);

  if (error) {
    return (
      <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
        <p className="text-red-500">Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
        <span className="text-sm text-gray-400">
          {isConnected ? 'Connected to PumpFun' : 'Disconnected'}
        </span>
      </div>

      {sortedTokens.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          Waiting for token data...
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {sortedTokens.map((token) => (
            <TokenCard
              key={token.address}
              {...token}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default TokenList;

import { FC, memo, useEffect, useMemo } from 'react';
import { unifiedWebSocket } from '@/lib/unified-websocket';
import { TokenFilters } from './TokenFilters';
import { useTokenFiltersStore, filterTokens } from '@/lib/token-filters';
import TokenCard from './TokenCard';
import { useUnifiedTokenStore } from '@/lib/unified-token-store';
import { motion, AnimatePresence } from 'framer-motion';
import DebugPanel from './DebugPanel';

export const TokenTracker: FC = memo(() => {
  const tokens = useUnifiedTokenStore(state => state.tokens);
  const activeFilter = useTokenFiltersStore(state => state.activeFilter);

  useEffect(() => {
    // Connect to WebSocket only once
    unifiedWebSocket.connect();

    return () => {
      unifiedWebSocket.disconnect();
    };
  }, []);

  // Memoize filtered tokens to prevent unnecessary recalculations
  const filteredTokens = useMemo(() => {
    console.log('[TokenTracker] Filtering tokens:', {
      totalTokens: tokens.length,
      activeFilter,
      timestamp: Date.now()
    });
    return filterTokens(tokens, activeFilter);
  }, [tokens, activeFilter]);

  return (
    <div className="max-w-7xl mx-auto px-4">
      <h1 
        className="text-4xl md:text-6xl font-bold text-center mb-12"
        style={{
          background: 'linear-gradient(to right, #3b82f6, #60a5fa)',
          backgroundClip: 'text',
          WebkitBackgroundClip: 'text',
          color: 'transparent',
          textShadow: '0 0 30px rgba(59, 130, 246, 0.5)',
        }}
      >
        Real-Time Token Tracker
      </h1>

      <TokenFilters />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence mode="popLayout">
          {filteredTokens.map((token, index) => (
            <TokenCard 
              key={token.address} 
              tokenAddress={token.address}
              index={index} 
            />
          ))}
        </AnimatePresence>
      </div>

      <DebugPanel />
    </div>
  );
});

TokenTracker.displayName = 'TokenTracker';

export default TokenTracker;
import { FC, useEffect, useMemo, useCallback } from 'react';
import TokenCard from './TokenCard';
import { useUnifiedTokenStore } from '@/lib/unified-token-store';
import { unifiedWebSocket } from '@/lib/unified-websocket';
import { motion, AnimatePresence } from 'framer-motion';

export const TokenTracker: FC = () => {
  // Use separate selectors to avoid unnecessary re-renders
  const tokens = useUnifiedTokenStore(state => state.tokens);
  const isConnected = useUnifiedTokenStore(state => state.isConnected);
  const addToken = useUnifiedTokenStore(state => state.addToken);

  // Memoize tokens array to prevent unnecessary re-renders
  const sortedTokens = useMemo(() => {
    return [...tokens].sort((a, b) => b.marketCapSol - a.marketCapSol);
  }, [tokens]);

  // Initialize WebSocket connection
  useEffect(() => {
    console.log('[TokenTracker] Initializing WebSocket connection');
    unifiedWebSocket.connect();
    return () => unifiedWebSocket.disconnect();
  }, []); // Only run once on mount

  return (
    <div className="max-w-7xl mx-auto px-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence>
          {sortedTokens.map((token, index) => (
            <motion.div
              key={token.address}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
            >
              <TokenCard tokenAddress={token.address} index={index} />
            </motion.div>
          ))}
        </AnimatePresence>
        {sortedTokens.length === 0 && (
          <div className="col-span-3 text-center py-12">
            <p className="text-gray-500">
              {isConnected ? 'Waiting for token data...' : 'Connecting to token services...'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TokenTracker;
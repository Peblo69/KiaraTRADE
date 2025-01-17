import { FC, useEffect } from 'react';
import { unifiedWebSocket } from '@/lib/unified-websocket';
import { TokenFilters } from './TokenFilters';
import { useTokenFiltersStore, filterTokens } from '@/lib/token-filters';
import TokenCard from './TokenCard';
import { useUnifiedTokenStore } from '@/lib/unified-token-store';
import { motion } from 'framer-motion';

export const TokenTracker: FC = () => {
  const tokens = useUnifiedTokenStore(state => state.tokens);
  const activeFilter = useTokenFiltersStore(state => state.activeFilter);

  useEffect(() => {
    unifiedWebSocket.connect();
    return () => unifiedWebSocket.disconnect();
  }, []);

  const filteredTokens = tokens && activeFilter ? filterTokens(tokens, activeFilter) : [];

  return (
    <div className="max-w-7xl mx-auto px-4">
      <TokenFilters />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTokens.map((token, index) => (
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
        {filteredTokens.length === 0 && (
          <div className="col-span-3 text-center py-12">
            <p className="text-gray-500">No tokens found matching the current filter.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TokenTracker;
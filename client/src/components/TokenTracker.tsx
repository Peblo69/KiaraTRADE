import { FC, useEffect } from 'react';
import { unifiedWebSocket } from '@/lib/unified-websocket';
import { pumpFunSocket } from '@/lib/pumpfun-websocket';
import TokenCard from './TokenCard';
import { useUnifiedTokenStore } from '@/lib/unified-token-store';
import { motion } from 'framer-motion';

export const TokenTracker: FC = () => {
  const tokens = useUnifiedTokenStore(state => state.tokens);
  const isConnected = useUnifiedTokenStore(state => state.isConnected);

  useEffect(() => {
    console.log('[TokenTracker] Initializing WebSocket connections');
    // Connect to both WebSocket services
    unifiedWebSocket.connect();
    pumpFunSocket.connect();

    return () => {
      console.log('[TokenTracker] Cleaning up WebSocket connections');
      unifiedWebSocket.disconnect();
      pumpFunSocket.disconnect();
    };
  }, []);

  console.log('[TokenTracker] Current token count:', tokens.length);
  console.log('[TokenTracker] Connection status:', isConnected);

  return (
    <div className="max-w-7xl mx-auto px-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tokens.map((token, index) => (
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
        {tokens.length === 0 && (
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
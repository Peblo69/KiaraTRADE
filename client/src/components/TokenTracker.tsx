import { FC, useEffect } from 'react';
import TokenCard from './TokenCard';
import { useUnifiedTokenStore } from '@/lib/unified-token-store';
import { motion } from 'framer-motion';

export const TokenTracker: FC = () => {
  const tokens = useUnifiedTokenStore(state => state.tokens);
  const isConnected = useUnifiedTokenStore(state => state.isConnected);

  useEffect(() => {
    console.log('[TokenTracker] Initializing WebSocket connection');

    // Connect to aggregator WebSocket
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('[TokenTracker] WebSocket connected');
      useUnifiedTokenStore.getState().setConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('[TokenTracker] Received message:', data);

        if (data.type === 'token_update') {
          useUnifiedTokenStore.getState().updateToken(data.tokenAddress, data.token);
        } else if (data.type === 'new_token') {
          useUnifiedTokenStore.getState().addToken(data.token, 'unified');
        }
      } catch (error) {
        console.error('[TokenTracker] Error processing message:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('[TokenTracker] WebSocket error:', error);
      useUnifiedTokenStore.getState().setError('WebSocket connection error');
    };

    ws.onclose = () => {
      console.log('[TokenTracker] WebSocket connection closed');
      useUnifiedTokenStore.getState().setConnected(false);
    };

    return () => {
      console.log('[TokenTracker] Cleaning up WebSocket connection');
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
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
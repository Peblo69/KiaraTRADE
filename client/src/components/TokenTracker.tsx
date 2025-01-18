import { FC, useEffect } from 'react';
import TokenCard from './TokenCard';
import { useUnifiedTokenStore } from '@/lib/unified-token-store';
import { motion } from 'framer-motion';

export const TokenTracker: FC = () => {
  const tokens = useUnifiedTokenStore(state => state.tokens);
  const isConnected = useUnifiedTokenStore(state => state.isConnected);

  useEffect(() => {
    console.log('[TokenTracker] Initializing with static data');

    // Add static test token
    useUnifiedTokenStore.getState().addToken({
      name: "Test Token",
      symbol: "TEST",
      marketCap: 1000000,
      marketCapSol: 1000,
      liquidityAdded: true,
      holders: 100,
      volume24h: 5000,
      address: "test123",
      price: 1.5,
      imageUrl: "https://cryptologos.cc/logos/solana-sol-logo.png"
    }, 'unified');

    useUnifiedTokenStore.getState().setConnected(true);

    return () => {
      console.log('[TokenTracker] Cleanup');
      useUnifiedTokenStore.getState().setConnected(false);
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
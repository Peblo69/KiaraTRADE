import { FC, useEffect, useMemo, useCallback } from 'react';
import TokenCard from './TokenCard';
import { useUnifiedTokenStore } from '@/lib/unified-token-store';
import { motion, AnimatePresence } from 'framer-motion';

export const TokenTracker: FC = () => {
  // Use separate selectors to avoid unnecessary re-renders
  const tokens = useUnifiedTokenStore(state => state.tokens);
  const isConnected = useUnifiedTokenStore(state => state.isConnected);
  const addToken = useUnifiedTokenStore(state => state.addToken);
  const setConnected = useUnifiedTokenStore(state => state.setConnected);

  // Memoize tokens array to prevent unnecessary re-renders
  const sortedTokens = useMemo(() => {
    return [...tokens].sort((a, b) => b.marketCapSol - a.marketCapSol);
  }, [tokens]);

  // Memoize the initialization function
  const initializeTestToken = useCallback(() => {
    if (tokens.length === 0) {
      addToken({
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
    }
  }, [tokens.length, addToken]);

  useEffect(() => {
    console.log('[TokenTracker] Initializing with static data');
    initializeTestToken();
    setConnected(true);
    return () => setConnected(false);
  }, [initializeTestToken, setConnected]);

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
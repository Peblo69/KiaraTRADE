import { FC, memo, useEffect } from 'react';
import { Card } from "@/components/ui/card";
import { pumpPortalSocket } from '@/lib/pump-portal-websocket';
import { heliusSocket } from '@/lib/helius-websocket';
import { TokenFilters } from './TokenFilters';
import { useTokenFiltersStore, filterTokens } from '@/lib/token-filters';
import TokenCard from './TokenCard';
import { usePumpPortalStore } from '@/lib/pump-portal-websocket';
import { motion, AnimatePresence } from 'framer-motion';

export const TokenTracker: FC = () => {
  const tokens = usePumpPortalStore(state => state.tokens);
  const activeFilter = useTokenFiltersStore(state => state.activeFilter);

  useEffect(() => {
    // Connect to WebSockets only once
    pumpPortalSocket.connect();
    heliusSocket.connect();

    return () => {
      pumpPortalSocket.disconnect();
      heliusSocket.disconnect();
    };
  }, []);

  const filteredTokens = filterTokens(tokens, activeFilter);

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
        <AnimatePresence>
          {filteredTokens.map((token, index) => (
            <TokenCard key={token.address || index} token={token} index={index} />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default memo(TokenTracker);
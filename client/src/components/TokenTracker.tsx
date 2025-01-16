import { FC, useEffect } from 'react';
import { Card } from "@/components/ui/card";
import { pumpPortalSocket, usePumpPortalStore } from '@/lib/pump-portal-websocket';
import { SiSolana } from 'react-icons/si';
import { ExternalLink, TrendingUp, Users, Wallet } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const formatNumber = (num: number) => {
  if (num >= 1000000000) {
    return `${(num / 1000000000).toFixed(2)}B`;
  }
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(2)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(2)}K`;
  }
  return num.toFixed(2);
};

const TokenCard: FC<{ token: any; index: number }> = ({ token, index }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, scale: 0.95 }}
    transition={{ duration: 0.3, delay: index * 0.1 }}
  >
    <Card className="p-4 backdrop-blur-sm bg-purple-900/10 border-purple-500/20 hover:border-purple-500/40 transition-all hover:transform hover:-translate-y-1">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="text-lg font-bold text-purple-300">{token.name || 'Unknown Token'}</h3>
          <p className="text-sm text-gray-400">{token.symbol || 'UNKNOWN'}</p>
        </div>
        <div className="flex gap-2">
          {token.signature && (
            <a 
              href={`https://solscan.io/tx/${token.signature}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-purple-400 hover:text-purple-300 transition-colors"
            >
              <ExternalLink size={16} />
            </a>
          )}
          {token.address && (
            <a 
              href={`https://solscan.io/token/${token.address}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-purple-400 hover:text-purple-300 transition-colors ml-2"
            >
              <SiSolana size={16} />
            </a>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <Wallet size={14} className="text-purple-400" />
            <span className="text-gray-300">Market Cap:</span>
            <span className="text-purple-300 font-semibold">{formatNumber(token.marketCap)} SOL</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Users size={14} className="text-purple-400" />
            <span className="text-gray-300">Initial Buy:</span>
            <span className="text-purple-300">{formatNumber(token.initialBuy || 0)}</span>
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <TrendingUp size={14} className="text-purple-400" />
            <span className="text-gray-300">SOL Amount:</span>
            <span className="text-purple-300">{token.solAmount?.toFixed(2) || '0.00'} SOL</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <SiSolana className="text-purple-400" />
            <span className="text-gray-300">Price:</span>
            <span className="text-purple-300">{(token.price || 0).toFixed(6)} SOL</span>
          </div>
        </div>
      </div>

      {token.liquidityAdded && (
        <div className="mt-3 text-xs">
          <span className="px-2 py-1 rounded-full bg-green-500/20 text-green-300">
            Pump Pool
          </span>
        </div>
      )}
    </Card>
  </motion.div>
);

export const TokenTracker: FC = () => {
  const tokens = usePumpPortalStore(state => state.tokens);

  useEffect(() => {
    pumpPortalSocket.connect();
    return () => {
      pumpPortalSocket.disconnect();
    };
  }, []);

  return (
    <div className="max-w-7xl mx-auto">
      <h1 
        className="text-4xl md:text-6xl font-bold text-center mb-8"
        style={{
          fontFamily: '"VT323", monospace',
          background: 'linear-gradient(to right, #00ff87 0%, #60efff 50%, #0061ff 100%)',
          backgroundClip: 'text',
          WebkitBackgroundClip: 'text',
          color: 'transparent',
          textShadow: '0 0 30px rgba(96, 239, 255, 0.4)',
          letterSpacing: '0.15em',
          filter: 'drop-shadow(0 0 10px rgba(96, 239, 255, 0.2))',
          animation: 'pulse 2s ease-in-out infinite'
        }}
      >
        PumpFun Token Tracker
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <AnimatePresence>
          {tokens.map((token, index) => (
            <TokenCard key={token.address || index} token={token} index={index} />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default TokenTracker;
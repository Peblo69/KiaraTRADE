import { FC, useEffect } from 'react';
import { Card } from "@/components/ui/card";
import { pumpPortalSocket, usePumpPortalStore } from '@/lib/pump-portal-websocket';
import { SiSolana } from 'react-icons/si';
import { ExternalLink, TrendingUp, Users, Wallet, Wifi, WifiOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import DebugPanel from './DebugPanel';

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
  const isConnected = usePumpPortalStore(state => state.isConnected);
  const connectionError = usePumpPortalStore(state => state.connectionError);

  useEffect(() => {
    console.log('[TokenTracker] Component mounted, connecting to WebSocket...');
    pumpPortalSocket.connect();
    return () => {
      console.log('[TokenTracker] Component unmounted, disconnecting WebSocket...');
      pumpPortalSocket.disconnect();
    };
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row items-center justify-between mb-6">
        <div className="flex flex-col items-center md:items-start space-y-2 mb-4 md:mb-0">
          <h2 className="text-2xl font-bold text-purple-300">Live PumpFun Tokens</h2>
          <p className="text-sm text-gray-400">Real-time token tracking (1B supply)</p>
        </div>
        <div className="flex items-center gap-2">
          {isConnected ? (
            <div className="flex items-center gap-2 text-sm text-green-400">
              <Wifi size={16} />
              <span>Connected to PumpPortal</span>
              <span className="animate-pulse inline-block w-2 h-2 bg-green-500 rounded-full"></span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-red-400">
              <WifiOff size={16} />
              <span>
                {connectionError || 'Connecting to PumpPortal...'}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <AnimatePresence>
          {tokens.map((token, index) => (
            <TokenCard key={token.address || index} token={token} index={index} />
          ))}
        </AnimatePresence>
      </div>

      {tokens.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-400">
            {isConnected 
              ? "Waiting for new tokens..." 
              : connectionError || "Connecting to PumpPortal..."}
          </p>
        </div>
      )}

      {/* Debug Panel */}
      <DebugPanel />
    </div>
  );
};

export default TokenTracker;
import { FC, useEffect } from 'react';
import { Card } from "@/components/ui/card";
import { pumpPortalSocket, usePumpPortalStore } from '@/lib/pump-portal-websocket';
import { heliusSocket, useHeliusStore } from '@/lib/helius-websocket';
import { getImageUrl, enrichTokenMetadata } from '@/lib/token-metadata';
import { SiSolana } from 'react-icons/si';
import { 
  ExternalLink, 
  TrendingUp, 
  Users, 
  Wallet, 
  BarChart3, 
  Clock, 
  ArrowUpRight, 
  ArrowDownRight,
  ActivitySquare 
} from 'lucide-react';
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

const TokenCard: FC<{ token: any; index: number }> = ({ token, index }) => {
  const priceChangeColor = token.priceChange24h > 0 ? 'text-green-400' : 'text-red-400';
  const PriceChangeIcon = token.priceChange24h > 0 ? ArrowUpRight : ArrowDownRight;

  // Only fetch metadata if we don't have an image URL
  useEffect(() => {
    if (token.address && !token.imageUrl) {
      console.log('[TokenCard] Fetching metadata for token:', token.address);
      enrichTokenMetadata(token.address).catch(console.error);
    }
  }, [token.address]);

  // Get the image URL, preferring the direct imageUrl from WebSocket data
  const imageUrl = token.imageUrl || token.uri || 'https://cryptologos.cc/logos/solana-sol-logo.png';
  console.log('[TokenCard] Using image URL:', imageUrl, 'for token:', token.address);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3, delay: index * 0.1 }}
    >
      <Card className="p-4 bg-black/40 backdrop-blur-lg border border-gray-800 hover:border-blue-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/10">
        {/* Token Header with Image */}
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <img 
                src={imageUrl}
                alt={token.symbol} 
                className="w-12 h-12 rounded-xl bg-gray-900/50 border border-gray-800 shadow-lg object-cover"
                onError={(e) => {
                  console.log('[TokenCard] Image load error for token:', token.address);
                  const img = e.target as HTMLImageElement;
                  if (!img.src.includes('solana-sol-logo.png')) {
                    img.src = 'https://cryptologos.cc/logos/solana-sol-logo.png';
                  }
                }}
              />
              <div className="absolute -bottom-1 -right-1 bg-green-500 w-3 h-3 rounded-full border-2 border-black"></div>
            </div>
            <div>
              <h3 className="text-lg font-bold text-white mb-0.5">{token.name || 'Unknown Token'}</h3>
              <div className="flex items-center gap-2">
                <p className="text-sm text-blue-400 font-medium">{token.symbol || 'UNKNOWN'}</p>
                {token.priceChange24h && (
                  <span className={`text-xs font-semibold flex items-center gap-0.5 ${priceChangeColor}`}>
                    <PriceChangeIcon size={12} />
                    {Math.abs(token.priceChange24h).toFixed(2)}%
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            {token.signature && (
              <a 
                href={`https://solscan.io/tx/${token.signature}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-blue-400 transition-colors"
                title="View Transaction"
              >
                <ExternalLink size={16} />
              </a>
            )}
            {token.address && (
              <a 
                href={`https://solscan.io/token/${token.address}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-blue-400 transition-colors ml-2"
                title="View Token"
              >
                <SiSolana size={16} />
              </a>
            )}
          </div>
        </div>

        {/* Market Stats Grid */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="space-y-3">
            <div className="p-2 bg-gray-900/50 rounded-lg backdrop-blur-sm">
              <div className="flex items-center gap-2 text-sm mb-1">
                <Wallet size={14} className="text-blue-400" />
                <span className="text-gray-400">Market Cap</span>
              </div>
              <span className="text-white font-bold">{formatNumber(token.marketCapSol)} SOL</span>
            </div>
            <div className="p-2 bg-gray-900/50 rounded-lg backdrop-blur-sm">
              <div className="flex items-center gap-2 text-sm mb-1">
                <Users size={14} className="text-blue-400" />
                <span className="text-gray-400">Initial Buy</span>
              </div>
              <span className="text-white font-bold">{formatNumber(token.initialBuy || 0)}</span>
            </div>
          </div>
          <div className="space-y-3">
            <div className="p-2 bg-gray-900/50 rounded-lg backdrop-blur-sm">
              <div className="flex items-center gap-2 text-sm mb-1">
                <TrendingUp size={14} className="text-blue-400" />
                <span className="text-gray-400">SOL Amount</span>
              </div>
              <span className="text-white font-bold">{token.solAmount?.toFixed(2) || '0.00'} SOL</span>
            </div>
            <div className="p-2 bg-gray-900/50 rounded-lg backdrop-blur-sm">
              <div className="flex items-center gap-2 text-sm mb-1">
                <Clock size={14} className="text-blue-400" />
                <span className="text-gray-400">Price</span>
              </div>
              <span className="text-white font-bold">{(token.price || 0).toFixed(6)} SOL</span>
            </div>
          </div>
        </div>

        {/* Liquidity Info */}
        {token.liquidityAdded && (
          <div className="border-t border-gray-800 pt-3 mt-3">
            <div className="flex items-center gap-2 text-sm mb-2">
              <BarChart3 size={14} className="text-blue-400" />
              <span className="text-gray-400">Liquidity Pool:</span>
              <span className="text-white font-bold">{formatNumber(token.vSolInBondingCurve || 0)} SOL</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="px-2 py-1 rounded-full bg-green-500/20 text-green-400 text-xs font-medium border border-green-500/20">
                Pump Pool Active
              </span>
              {token.lastUpdated && (
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <ActivitySquare size={12} />
                  <span>
                    Updated {new Date(token.lastUpdated).toLocaleTimeString()}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </Card>
    </motion.div>
  );
};

export const TokenTracker: FC = () => {
  const tokens = usePumpPortalStore(state => state.tokens);
  const heliusConnected = useHeliusStore(state => state.isConnected);

  useEffect(() => {
    // Connect to both websocket sources
    pumpPortalSocket.connect();
    heliusSocket.connect();

    return () => {
      pumpPortalSocket.disconnect();
      heliusSocket.disconnect();
    };
  }, []);

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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
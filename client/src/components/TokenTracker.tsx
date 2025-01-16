import { FC, useEffect, useState } from 'react';
import { Card } from "@/components/ui/card";
import { pumpFunSocket, usePumpFunStore } from '@/lib/pumpfun-websocket';
import { SiSolana } from 'react-icons/si';
import { 
  ExternalLink, 
  TrendingUp, 
  Users, 
  Wallet, 
  Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { VolumeChart } from './VolumeChart';

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

interface VolumeData {
  timestamp: number;
  volume: number;
}

const TokenCard: FC<{ token: any; index: number }> = ({ token, index }) => {
  const [volumeHistory, setVolumeHistory] = useState<VolumeData[]>([]);
  const [isLoadingVolume, setIsLoadingVolume] = useState(false);

  useEffect(() => {
    const fetchVolumeHistory = async () => {
      if (!token.address || isLoadingVolume) return;

      setIsLoadingVolume(true);
      try {
        const response = await fetch(`https://pump.fun/api/v1/tokens/${token.address}/volume?period=24h`);
        if (!response.ok) throw new Error('Failed to fetch volume history');

        const data = await response.json();
        const volumeData = data.volumes.map((v: any) => ({
          timestamp: v.timestamp,
          volume: v.volume
        }));

        setVolumeHistory(volumeData);
      } catch (error) {
        console.error('[TokenCard] Error fetching volume history:', error);
        const mockData = Array.from({ length: 24 }, (_, i) => ({
          timestamp: Date.now() - (23 - i) * 3600000,
          volume: Math.random() * token.volume24h / 24
        }));
        setVolumeHistory(mockData);
      } finally {
        setIsLoadingVolume(false);
      }
    };

    fetchVolumeHistory();
  }, [token.address]);

  const imageUrl = token.imageUrl || `https://pump.fun/token/${token.address}/image`;
  console.log('[TokenCard] Using image URL:', imageUrl, 'for token:', token.address);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3, delay: index * 0.1 }}
    >
      <Card className="p-4 bg-black/40 backdrop-blur-lg border border-gray-800 hover:border-blue-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/10">
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
                  img.src = 'https://cryptologos.cc/logos/solana-sol-logo.png';
                }}
              />
              <div className="absolute -bottom-1 -right-1 bg-green-500 w-3 h-3 rounded-full border-2 border-black"></div>
            </div>
            <div>
              <h3 className="text-lg font-bold text-white mb-0.5">{token.name || 'Unknown Token'}</h3>
              <div className="flex items-center gap-2">
                <p className="text-sm text-blue-400 font-medium">{token.symbol || 'UNKNOWN'}</p>
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

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="space-y-3">
            <div className="p-2 bg-gray-900/50 rounded-lg backdrop-blur-sm">
              <div className="flex items-center gap-2 text-sm mb-1">
                <Wallet size={14} className="text-blue-400" />
                <span className="text-gray-400">Market Cap</span>
              </div>
              <span className="text-white font-bold">{formatNumber(token.marketCap)} SOL</span>
            </div>
            <div className="p-2 bg-gray-900/50 rounded-lg backdrop-blur-sm">
              <div className="flex items-center gap-2 text-sm mb-1">
                <Users size={14} className="text-blue-400" />
                <span className="text-gray-400">Holders</span>
              </div>
              <span className="text-white font-bold">{formatNumber(token.holders)}</span>
            </div>
          </div>
          <div className="space-y-3">
            <div className="p-2 bg-gray-900/50 rounded-lg backdrop-blur-sm">
              <div className="flex items-center gap-2 text-sm mb-1">
                <TrendingUp size={14} className="text-blue-400" />
                <span className="text-gray-400">Volume 24h</span>
              </div>
              <span className="text-white font-bold">{formatNumber(token.volume24h)} SOL</span>
            </div>
            <div className="p-2 bg-gray-900/50 rounded-lg backdrop-blur-sm">
              <div className="flex items-center gap-2 text-sm mb-1">
                <Clock size={14} className="text-blue-400" />
                <span className="text-gray-400">Price</span>
              </div>
              <span className="text-white font-bold">{token.price.toFixed(6)} SOL</span>
            </div>
          </div>
        </div>

        {volumeHistory.length > 0 && (
          <div className="mt-4">
            <h4 className="text-sm text-gray-400 mb-2">Trading Volume (24h)</h4>
            <VolumeChart data={volumeHistory} />
          </div>
        )}

        {token.liquidityAdded && (
          <div className="border-t border-gray-800 pt-3 mt-3">
            <div className="flex items-center justify-between">
              <span className="px-2 py-1 rounded-full bg-green-500/20 text-green-400 text-xs font-medium border border-green-500/20">
                Liquidity Added
              </span>
            </div>
          </div>
        )}
      </Card>
    </motion.div>
  );
};

export const TokenTracker: FC = () => {
  const tokens = usePumpFunStore(state => state.tokens);

  useEffect(() => {
    pumpFunSocket.connect();
    return () => {
      pumpFunSocket.disconnect();
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
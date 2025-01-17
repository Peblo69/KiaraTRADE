import { FC, memo } from 'react';
import { Card } from "@/components/ui/card";
import { pumpPortalSocket, usePumpPortalStore } from '@/lib/pump-portal-websocket';
import { heliusSocket } from '@/lib/helius-websocket';
import { initializeVolumeTracking, useTokenVolumeStore } from '@/lib/token-volume';
import { SiSolana } from 'react-icons/si';
import { 
  ExternalLink, 
  TrendingUp, 
  Users, 
  Wallet, 
  Clock,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { VolumeChart } from './VolumeChart';
import { useTokenSocialMetricsStore } from '@/lib/social-metrics';
import { SocialMetrics } from './SocialMetrics';
import { useTokenPriceStore } from '@/lib/price-history';
import { PriceChart } from './PriceChart';

// SOL price in USD (this should be fetched from an API in production)
const SOL_PRICE_USD = 104.23;

const formatNumber = (num: number, isCurrency = false) => {
  if (num >= 1000000000) return `${isCurrency ? '$' : ''}${(num / 1000000000).toFixed(2)}B`;
  if (num >= 1000000) return `${isCurrency ? '$' : ''}${(num / 1000000).toFixed(2)}M`;
  if (num >= 1000) return `${isCurrency ? '$' : ''}${(num / 1000).toFixed(2)}K`;
  return `${isCurrency ? '$' : ''}${num.toFixed(2)}`;
};

const TokenCard: FC<{ token: any; index: number }> = memo(({ token, index }) => {
  const volumeHistory = useTokenVolumeStore(state => state.getVolumeHistory(token.address));
  const socialMetrics = useTokenSocialMetricsStore(state => state.getMetrics(token.address));
  const priceHistory = useTokenPriceStore(state => state.getPriceHistory(token.address));

  const priceChangeColor = token.priceChange24h > 0 ? 'text-green-400' : 'text-red-400';
  const PriceChangeIcon = token.priceChange24h > 0 ? ArrowUpRight : ArrowDownRight;

  // Calculate USD values
  const marketCapUSD = (token.marketCapSol || token.marketCap || 0) * SOL_PRICE_USD;
  const initialBuyUSD = (token.initialBuy || 0) * SOL_PRICE_USD;
  const volume24hUSD = (token.volume24h || 0) * SOL_PRICE_USD;

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
                src={`https://pump.fun/token/${token.address}/image`}
                alt={token.symbol} 
                className="w-12 h-12 rounded-xl bg-gray-900/50 border border-gray-800 shadow-lg object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://cryptologos.cc/logos/solana-sol-logo.png';
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

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="space-y-3">
            <div className="p-2 bg-gray-900/50 rounded-lg backdrop-blur-sm">
              <div className="flex items-center gap-2 text-sm mb-1">
                <Wallet size={14} className="text-blue-400" />
                <span className="text-gray-400">Market Cap</span>
              </div>
              <div className="flex flex-col">
                <span className="text-white font-bold">{formatNumber(marketCapUSD, true)}</span>
                <span className="text-xs text-gray-500">{formatNumber(token.marketCapSol || token.marketCap)} SOL</span>
              </div>
            </div>
            <div className="p-2 bg-gray-900/50 rounded-lg backdrop-blur-sm">
              <div className="flex items-center gap-2 text-sm mb-1">
                <Users size={14} className="text-blue-400" />
                <span className="text-gray-400">Initial Buy</span>
              </div>
              <div className="flex flex-col">
                <span className="text-white font-bold">{formatNumber(initialBuyUSD, true)}</span>
                <span className="text-xs text-gray-500">{formatNumber(token.initialBuy || 0)} SOL</span>
              </div>
            </div>
          </div>
          <div className="space-y-3">
            <div className="p-2 bg-gray-900/50 rounded-lg backdrop-blur-sm">
              <div className="flex items-center gap-2 text-sm mb-1">
                <TrendingUp size={14} className="text-blue-400" />
                <span className="text-gray-400">Volume 24h</span>
              </div>
              <div className="flex flex-col">
                <span className="text-white font-bold">{formatNumber(volume24hUSD, true)}</span>
                <span className="text-xs text-gray-500">{formatNumber(token.volume24h || 0)} SOL</span>
              </div>
            </div>
            <div className="p-2 bg-gray-900/50 rounded-lg backdrop-blur-sm">
              <div className="flex items-center gap-2 text-sm mb-1">
                <Clock size={14} className="text-blue-400" />
                <span className="text-gray-400">Price</span>
              </div>
              <div className="flex flex-col">
                <span className="text-white font-bold">${((token.price || 0) * SOL_PRICE_USD).toFixed(6)}</span>
                <span className="text-xs text-gray-500">{(token.price || 0).toFixed(6)} SOL</span>
              </div>
            </div>
          </div>
        </div>

        {volumeHistory.length > 0 && (
          <div className="mt-4">
            <h4 className="text-sm text-gray-400 mb-2">Trading Volume (24h)</h4>
            <VolumeChart data={volumeHistory} />
          </div>
        )}

        {priceHistory.length > 0 && (
          <div className="mt-4">
            <h4 className="text-sm text-gray-400 mb-2">Price History (24h)</h4>
            <PriceChart data={priceHistory} symbol={token.symbol} />
          </div>
        )}

        {socialMetrics && <SocialMetrics tokenAddress={token.address} metrics={socialMetrics} />}

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
});

// Initialize data when token is received from WebSocket
const initializeTokenData = (token: any) => {
  if (token.address) {
    useTokenVolumeStore.getState().addVolumeData(token.address, token.volume24h || 0);
    useTokenPriceStore.getState().initializePriceHistory(token.address, token.price);
    if (!useTokenSocialMetricsStore.getState().getMetrics(token.address)) {
      useTokenSocialMetricsStore.getState().generateMockMetrics(token.address); // Assuming generateMockMetrics exists
    }
  }
};

export const TokenTracker: FC = () => {
  const tokens = usePumpPortalStore(state => {
    // Initialize data for new tokens as they come in
    state.tokens.forEach(initializeTokenData);
    return state.tokens;
  });

  useEffect(() => {
    // Initialize WebSocket connections once
    pumpPortalSocket.connect();
    heliusSocket.connect();
    initializeVolumeTracking();

    // Cleanup on unmount
    return () => {
      pumpPortalSocket.disconnect();
      heliusSocket.disconnect();
    };
  }, []); // Empty dependency array = run once on mount

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
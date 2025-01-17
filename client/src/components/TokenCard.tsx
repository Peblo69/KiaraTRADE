import { FC, memo, useState, useMemo, useCallback } from 'react';
import { Card } from "@/components/ui/card";
import { SiSolana } from 'react-icons/si';
import { 
  TrendingUp, 
  Users, 
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Globe,
  TwitterIcon
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useUnifiedTokenStore } from '@/lib/unified-token-store';
import { TransactionHistory } from './TransactionHistory';
import { CandlestickChart } from './CandlestickChart';

// SOL price in USD (this should be fetched from an API in production)
const SOL_PRICE_USD = 104.23;

const formatNumber = (num: number, isCurrency = false) => {
  if (num >= 1000000000) return `${isCurrency ? '$' : ''}${(num / 1000000000).toFixed(2)}B`;
  if (num >= 1000000) return `${isCurrency ? '$' : ''}${(num / 1000000).toFixed(2)}M`;
  if (num >= 1000) return `${isCurrency ? '$' : ''}${(num / 1000).toFixed(2)}K`;
  return `${isCurrency ? '$' : ''}${num.toFixed(2)}`;
};

interface TokenCardProps {
  tokenAddress: string;
  index: number;
}

// Memoized TokenImage component
const TokenImage: FC<{ metadata: any; address: string }> = memo(({ metadata, address }) => {
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const imageUrl = useMemo(() => {
    if (imageError || !address) {
      return 'https://cryptologos.cc/logos/solana-sol-logo.png';
    }

    if (metadata?.image) {
      if (metadata.image.startsWith('ipfs://')) {
        const ipfsHash = metadata.image.replace('ipfs://', '');
        return `https://ipfs.io/ipfs/${ipfsHash}`;
      }
      return metadata.image;
    }

    return `https://pump.fun/token/${address}/image`;
  }, [address, metadata?.image, imageError]);

  const handleError = useCallback(() => {
    setImageError(true);
    setIsLoading(false);
  }, []);

  const handleLoad = useCallback(() => {
    setIsLoading(false);
  }, []);

  return (
    <div className="relative w-12 h-12">
      <img 
        src={imageUrl}
        alt={metadata?.symbol || 'Token'} 
        className={`w-full h-full rounded-xl bg-gray-900/50 border border-gray-800 shadow-lg object-cover transition-opacity duration-200 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
        onError={handleError}
        onLoad={handleLoad}
      />
      {isLoading && (
        <div className="absolute inset-0 bg-gray-900/50 rounded-xl flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
      {imageError && (
        <div className="absolute inset-0 bg-gray-900/50 rounded-xl flex items-center justify-center">
          <SiSolana size={24} className="text-blue-400" />
        </div>
      )}
      <div className="absolute -bottom-1 -right-1 bg-green-500 w-3 h-3 rounded-full border-2 border-black"></div>
    </div>
  );
});

TokenImage.displayName = 'TokenImage';

// Memoized TokenPrice component
const TokenPrice: FC<{ price: number; priceChange24h: number }> = memo(({ price, priceChange24h }) => {
  const priceChangeColor = priceChange24h > 0 ? 'text-green-400' : 'text-red-400';
  const PriceChangeIcon = priceChange24h > 0 ? ArrowUpRight : ArrowDownRight;

  return (
    <div className="p-2 bg-gray-900/50 rounded-lg backdrop-blur-sm">
      <div className="flex items-center gap-2 text-sm mb-1">
        <TrendingUp size={14} className="text-blue-400" />
        <span className="text-gray-400">Price</span>
      </div>
      <div className="flex flex-col">
        <span className="text-white font-bold">${(price * SOL_PRICE_USD).toFixed(6)}</span>
        <span className="text-xs text-gray-500">{price.toFixed(6)} SOL</span>
        {priceChange24h !== 0 && (
          <span className={`text-xs font-semibold flex items-center gap-0.5 mt-1 ${priceChangeColor}`}>
            <PriceChangeIcon size={12} />
            {Math.abs(priceChange24h).toFixed(2)}%
          </span>
        )}
      </div>
    </div>
  );
});

TokenPrice.displayName = 'TokenPrice';

// Main TokenCard component with optimized renders
const TokenCard: FC<TokenCardProps> = memo(({ tokenAddress, index }) => {
  console.log('[TokenCard] Rendering:', {
    tokenAddress,
    index,
    timestamp: Date.now()
  });

  // Use selector pattern to minimize re-renders
  const token = useUnifiedTokenStore(
    useCallback((state) => {
      console.log('[TokenCard] Selecting token:', {
        tokenAddress,
        timestamp: Date.now()
      });
      return state.getToken(tokenAddress);
    }, [tokenAddress])
  );

  const priceHistory = useUnifiedTokenStore(
    useCallback((state) => {
      console.log('[TokenCard] Selecting price history:', {
        tokenAddress,
        timestamp: Date.now()
      });
      return state.getPriceHistory(tokenAddress);
    }, [tokenAddress])
  );

  // Early return if token is not found
  if (!token) {
    console.log('[TokenCard] Token not found:', tokenAddress);
    return null;
  }

  // Log when memoized values are recalculated
  const { marketCapUSD, initialBuyUSD, volume24hUSD } = useMemo(() => {
    console.log('[TokenCard] Recalculating derived values:', {
      tokenAddress,
      timestamp: Date.now()
    });

    return {
      marketCapUSD: token.marketCapSol * SOL_PRICE_USD,
      initialBuyUSD: (token.solAmount || 0) * SOL_PRICE_USD,
      volume24hUSD: (token.volume24h || 0) * SOL_PRICE_USD
    };
  }, [token.marketCapSol, token.solAmount, token.volume24h]);

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
            <TokenImage metadata={token.metadata} address={token.address} />
            <div>
              <h3 className="text-lg font-bold text-white mb-0.5">
                {token.metadata?.name || token.name || 'Unknown Token'}
              </h3>
              <div className="flex items-center gap-2">
                <p className="text-sm text-blue-400 font-medium">
                  {token.metadata?.symbol || token.symbol || 'UNKNOWN'}
                </p>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            {token.metadata?.twitter && (
              <a 
                href={token.metadata.twitter}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-blue-400 transition-colors"
              >
                <TwitterIcon size={16} />
              </a>
            )}
            {token.metadata?.website && (
              <a 
                href={token.metadata.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-blue-400 transition-colors"
              >
                <Globe size={16} />
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
                <span className="text-xs text-gray-500">{formatNumber(token.marketCapSol)} SOL</span>
              </div>
            </div>
            <div className="p-2 bg-gray-900/50 rounded-lg backdrop-blur-sm">
              <div className="flex items-center gap-2 text-sm mb-1">
                <Users size={14} className="text-blue-400" />
                <span className="text-gray-400">Initial Buy</span>
              </div>
              <div className="flex flex-col">
                <span className="text-white font-bold">{formatNumber(initialBuyUSD, true)}</span>
                <span className="text-xs text-gray-500">{formatNumber(token.solAmount || 0)} SOL</span>
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
            <TokenPrice price={token.price || 0} priceChange24h={token.priceChange24h || 0} />
          </div>
        </div>

        <div className="mt-4 border-t border-gray-800 pt-4">
          <h4 className="text-sm text-gray-400 mb-2">Price & Market Cap</h4>
          {priceHistory.length > 0 && <CandlestickChart data={priceHistory} />}
        </div>

        <TransactionHistory tokenAddress={token.address} />

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

TokenCard.displayName = 'TokenCard';

export default TokenCard;
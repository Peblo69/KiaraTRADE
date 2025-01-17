import { FC, memo, useState } from 'react';
import { Card } from "@/components/ui/card";
import { SiSolana } from 'react-icons/si';
import { 
  TrendingUp, 
  Users, 
  Wallet,
  Globe,
  TwitterIcon
} from 'lucide-react';
import { useUnifiedTokenStore } from '@/lib/unified-token-store';
import TransactionHistory from './TransactionHistory';

const SOL_PRICE_USD = 104.23;
const PUMPFUN_LOGO = "https://files.catbox.moe/0z99ub.png";
const DEFAULT_TOKEN_IMAGE = "https://cryptologos.cc/logos/solana-sol-logo.png?v=024";

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

const TokenCard: FC<TokenCardProps> = memo(({ tokenAddress, index }) => {
  const token = useUnifiedTokenStore(state => state.getToken(tokenAddress));
  const [imageError, setImageError] = useState(false);

  if (!token) return null;

  const handleImageError = () => {
    console.log(`[TokenCard] Image failed to load for token ${tokenAddress}, using fallback`);
    setImageError(true);
  };

  const displayImageUrl = imageError ? 
    DEFAULT_TOKEN_IMAGE : 
    `https://pumpfun.fun/i/${token.address}/image`;

  return (
    <Card className="p-4 bg-black/40 backdrop-blur-lg border border-gray-800 hover:border-blue-500/50 transition-all duration-300">
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-12 h-12 relative rounded-xl overflow-hidden">
              <img 
                src={displayImageUrl}
                alt={token.symbol || 'Token'} 
                className="w-full h-full bg-gray-900/50 border border-gray-800 shadow-lg object-cover"
                onError={handleImageError}
                loading="lazy"
              />
            </div>
          </div>
          <div>
            <h3 className="text-lg font-bold text-white mb-0.5">
              {token.name || 'Unknown Token'}
            </h3>
            <div className="flex items-center gap-2">
              <p className="text-sm text-blue-400 font-medium">
                {token.symbol || 'UNKNOWN'}
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
            <>
              <a 
                href={`https://solscan.io/token/${token.address}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-blue-400 transition-colors"
              >
                <SiSolana size={16} />
              </a>
              <a 
                href={`https://pumpfun.fun/token/${token.address}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-blue-400 transition-colors"
              >
                <img
                  src={PUMPFUN_LOGO}
                  alt="View on PumpFun"
                  className="w-4 h-4 object-contain"
                />
              </a>
            </>
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
              <span className="text-white font-bold">{formatNumber(token.marketCapSol * SOL_PRICE_USD, true)}</span>
              <span className="text-xs text-gray-500">{formatNumber(token.marketCapSol)} SOL</span>
            </div>
          </div>
          <div className="p-2 bg-gray-900/50 rounded-lg backdrop-blur-sm">
            <div className="flex items-center gap-2 text-sm mb-1">
              <Users size={14} className="text-blue-400" />
              <span className="text-gray-400">Initial Buy</span>
            </div>
            <div className="flex flex-col">
              <span className="text-white font-bold">{formatNumber((token.solAmount || 0) * SOL_PRICE_USD, true)}</span>
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
              <span className="text-white font-bold">{formatNumber((token.volume24h || 0) * SOL_PRICE_USD, true)}</span>
              <span className="text-xs text-gray-500">{formatNumber(token.volume24h || 0)} SOL</span>
            </div>
          </div>
          <div className="p-2 bg-gray-900/50 rounded-lg backdrop-blur-sm">
            <div className="flex items-center gap-2 text-sm mb-1">
              <TrendingUp size={14} className="text-blue-400" />
              <span className="text-gray-400">Price</span>
            </div>
            <div className="flex flex-col">
              <span className="text-white font-bold">${(token.price * SOL_PRICE_USD).toFixed(6)}</span>
              <span className="text-xs text-gray-500">{token.price.toFixed(6)} SOL</span>
            </div>
          </div>
        </div>
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
  );
});

TokenCard.displayName = 'TokenCard';

export default TokenCard;
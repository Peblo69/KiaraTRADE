import { FC, useState, useEffect } from 'react';
import { Card } from "@/components/ui/card";
import { ImageIcon, Globe, Search, Users, Crosshair, UserPlus, Copy } from 'lucide-react';
import { validateImageUrl } from '@/utils/image-handler';
import { validateSocialUrl } from '@/utils/social-links';
import { THRESHOLDS, getRiskLevelColor, formatMarketCap, calculateMarketCapProgress } from '@/utils/token-metrics';
import { cn } from "@/lib/utils";
import { PumpFunIcon } from './icons/PumpFunIcon';
import { TelegramIcon } from './icons/TelegramIcon';
import { XIcon } from './icons/XIcon';
import { DevHoldingIcon } from './icons/DevHoldingIcon';
import { InsiderIcon } from './icons/InsiderIcon';
import type { Token } from '@/types/token';

interface TokenCardProps {
  token: Token;
  onClick: () => void;
  onBuyClick?: () => void;
  onCopyAddress?: () => void;
}

export const TokenCard: FC<TokenCardProps> = ({ 
  token, 
  onClick, 
  onBuyClick = () => console.log('Buy clicked'), 
  onCopyAddress = () => console.log('Address copied')
}) => {
  const [imageError, setImageError] = useState(false);
  const [validatedImageUrl, setValidatedImageUrl] = useState<string | null>(null);
  const [currentProgress, setCurrentProgress] = useState(0);

  useEffect(() => {
    const rawImageUrl = token.metadata?.imageUrl || token.imageUrl;
    const processedUrl = validateImageUrl(rawImageUrl);
    setValidatedImageUrl(processedUrl);
  }, [token]);

  useEffect(() => {
    const targetProgress = calculateMarketCapProgress(token.marketCapSol || 0);
    if (currentProgress !== targetProgress) {
      const step = (targetProgress - currentProgress) / 10;
      const timeout = setTimeout(() => {
        setCurrentProgress(prev => {
          const next = prev + step;
          return Math.abs(next - targetProgress) < 0.1 ? targetProgress : next;
        });
      }, 50);
      return () => clearTimeout(timeout);
    }
  }, [token.marketCapSol, currentProgress]);

  const displayName = token.name || token.metadata?.name || `Token ${token.address.slice(0, 8)}`;
  const displaySymbol = token.symbol || token.metadata?.symbol || token.address.slice(0, 6).toUpperCase();

  const marketCap = token.marketCapSol || 35000;
  const volume = token.vSolInBondingCurve?.toFixed(2) || '0.00';
  const topHoldersPercentage = token.top10HoldersPercentage || 0;
  const devWalletPercentage = token.devWalletPercentage || 0;
  const insiderPercentage = token.insiderPercentage;
  const snipersCount = token.snipersCount;
  const holdersCount = token.holdersCount || 0;

  const progressPercentage = currentProgress; // Use the animated progress

  const handleBuyClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onBuyClick();
  };

  const handleCopyAddress = (e: React.MouseEvent) => {
    e.stopPropagation();
    onCopyAddress();
  };

  const handleImageClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const searchQuery = encodeURIComponent(`${displayName} ${displaySymbol} token logo`);
    window.open(`https://www.google.com/search?q=${searchQuery}&tbm=isch`, '_blank', 'noopener,noreferrer');
  };

  const getTopHoldersColor = (percentage: number) => 
    percentage <= 15 ? "text-green-400 hover:text-green-300" : "text-red-400 hover:text-red-300";

  const getDevHoldingColor = (percentage: number) => 
    percentage <= 15 ? "text-green-400" : "text-red-400";

  const getInsiderColor = (percentage: number) => 
    percentage <= 10 ? "text-green-400" : "text-red-400";

  const getSnipersColor = (count: number) => 
    count <= 5 ? "text-green-400" : "text-red-400";

  return (
    <Card 
      className={cn(
        "group cursor-pointer transition-all duration-300 cosmic-glow space-gradient",
        "hover:scale-[1.02] hover:shadow-lg hover:shadow-purple-500/20",
        "p-2 relative overflow-hidden"
      )}
      onClick={onClick}
    >
      <div className="ambient-glow" />

      <div className="relative p-2">
        <div className="flex items-start gap-3">
          <div 
            onClick={handleImageClick}
            className={cn(
              "w-10 h-10 flex-shrink-0 relative rounded-lg overflow-hidden cursor-pointer",
              "bg-gradient-to-br from-purple-900/20 to-black/30",
              "border border-purple-500/20",
              "hover:border-purple-400/40 transition-colors",
              "group/image"
            )}
          >
            {validatedImageUrl && !imageError ? (
              <>
                <img
                  src={validatedImageUrl}
                  alt={displayName}
                  className="w-full h-full object-cover transform group-hover/image:scale-110 transition-all duration-700"
                  onError={() => setImageError(true)}
                />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/image:opacity-100 transition-opacity flex items-center justify-center">
                  <Search className="w-4 h-4 text-white/90" />
                </div>
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center animate-pulse group-hover/image:animate-none">
                <span className="text-2xl font-bold text-purple-400/70 group-hover/image:text-purple-300/90">
                  {displaySymbol[0] || <ImageIcon className="w-8 h-8 text-purple-400/50" />}
                </span>
              </div>
            )}
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-purple-500/20 rounded-full border border-purple-500/40 flex items-center justify-center">
              <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
            </div>
          </div>

          <div className="flex-grow min-w-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 min-w-0">
                <h3 className="text-sm font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-200 to-purple-400 truncate">
                  {displaySymbol}
                </h3>
                <div className="flex items-center justify-center w-4 h-4 rounded border border-gray-600/40 bg-gray-800/40 hover:bg-gray-700/40 transition-colors cursor-pointer group/copy" onClick={handleCopyAddress}>
                  <Copy size={10} className="text-gray-400 group-hover/copy:text-gray-300" />
                </div>
              </div>
              <button
                onClick={handleBuyClick}
                className="flex items-center gap-1 px-2 py-0.5 text-xs rounded-md border border-yellow-500/30 bg-yellow-500/10 hover:bg-yellow-500/20 transition-colors"
              >
                <span className="text-yellow-500">⚡</span>
                <span className="text-yellow-400 font-medium">Buy</span>
              </button>
            </div>

            <div className="flex items-center justify-between text-xs text-gray-400 mt-0.5 mb-1">
              <div className="flex items-center gap-2">
                <span>4h</span>
                <button
                  className={cn(
                    "flex items-center gap-1 transition-colors",
                    getTopHoldersColor(topHoldersPercentage)
                  )}
                >
                  <UserPlus size={13} className="stroke-[2.5]" />
                  <span>{topHoldersPercentage}%</span>
                </button>
                {devWalletPercentage > 0 && (
                  <span className={cn(
                    "flex items-center gap-1",
                    getDevHoldingColor(devWalletPercentage)
                  )}>
                    <DevHoldingIcon className="current-color" /> {devWalletPercentage}%
                  </span>
                )}
                {typeof insiderPercentage !== 'undefined' && insiderPercentage > 0 && (
                  <span className={cn(
                    "flex items-center gap-1",
                    getInsiderColor(insiderPercentage)
                  )}>
                    <InsiderIcon className="current-color" /> {insiderPercentage}%
                  </span>
                )}
                {typeof snipersCount !== 'undefined' && snipersCount > 0 && (
                  <span className={cn(
                    "flex items-center gap-1",
                    getSnipersColor(snipersCount)
                  )}>
                    <Crosshair size={12} className="current-color" /> {snipersCount}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] mt-2">
              <div className="flex items-center gap-2">
                {token.socials?.website && (
                  <a
                    href={validateSocialUrl(token.socials.website)}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-blue-400/70 hover:text-blue-300 transition-colors"
                  >
                    <Globe size={14} />
                  </a>
                )}
                {token.socials?.twitter && (
                  <a
                    href={validateSocialUrl(token.socials.twitter)}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-blue-400/70 hover:text-blue-300 transition-colors"
                  >
                    <XIcon className="w-3.5 h-3.5" />
                  </a>
                )}
                {token.socials?.telegram && (
                  <a
                    href={validateSocialUrl(token.socials.telegram)}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-blue-400/70 hover:text-blue-300 transition-colors"
                  >
                    <TelegramIcon className="w-3.5 h-3.5" />
                  </a>
                )}
                {token.socials?.pumpfun && (
                  <a
                    href={validateSocialUrl(token.socials.pumpfun)}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-blue-400/70 hover:text-blue-300 transition-colors"
                  >
                    <PumpFunIcon className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <Users size={12} className="text-gray-400" />
                  <span className="text-purple-200">{holdersCount}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-gray-400">V</span>
                  <span className="text-purple-200">${volume}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-gray-400">MC</span>
                  <span className="text-purple-200">${formatMarketCap(marketCap)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 w-full h-0.5 bg-purple-900/20">
        <div 
          className="h-full bg-gradient-to-r from-purple-500 via-purple-400 to-purple-500 relative overflow-hidden transition-all duration-1000 ease-out"
          style={{ width: `${progressPercentage}%` }}
        >
          <div className="absolute inset-0 w-full h-full animate-shine">
            <div className="absolute top-0 left-0 w-1/2 h-full bg-gradient-to-r from-transparent via-purple-300/30 to-transparent transform -skew-x-12"></div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default TokenCard;
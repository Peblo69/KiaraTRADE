import { FC, useState, useEffect } from 'react';
import { Card } from "./ui/card";
import { ImageIcon, Globe, Search, Users, Crosshair, UserPlus, Copy } from 'lucide-react';
import { validateImageUrl } from '../utils/image-handler';
import { validateSocialUrl } from '../utils/social-links';
import { THRESHOLDS, getRiskLevelColor, formatMarketCap, calculateMarketCapProgress } from '../utils/token-metrics';
import { cn } from "../lib/utils";
import { PumpFunIcon } from './icons/PumpFunIcon';
import { TelegramIcon } from './icons/TelegramIcon';
import { XIcon } from './icons/XIcon';
import { DevHoldingIcon } from './icons/DevHoldingIcon';
import { InsiderIcon } from './icons/InsiderIcon';
import type { Token } from '../types/token';

interface TokenCardProps {
  token: Token;
  onClick: () => void;
  onBuyClick?: () => void;
  onCopyAddress?: () => void;
}

/**
 * TokenCard Component
 * 
 * Integration Points:
 * 1. Token Data: Expects a Token interface object with all relevant metrics
 * 2. Events: Provides callbacks for user interactions
 * 3. Social Links: Validates and handles social media URLs
 * 4. Metrics Display: Conditionally renders metrics based on data availability
 */
export const TokenCard: FC<TokenCardProps> = ({ 
  token, 
  onClick, 
  onBuyClick = () => console.log('Buy clicked'), 
  onCopyAddress = () => console.log('Address copied')
}) => {
  const [imageError, setImageError] = useState(false);
  const [validatedImageUrl, setValidatedImageUrl] = useState<string | null>(null);

  // Validate and set image URL on token change
  useEffect(() => {
    const rawImageUrl = token.metadata?.imageUrl || token.imageUrl;
    const processedUrl = validateImageUrl(rawImageUrl);
    setValidatedImageUrl(processedUrl);
  }, [token]);

  // Display values with fallbacks
  const displayName = token.name || token.metadata?.name || `Token ${token.address.slice(0, 8)}`;
  const displaySymbol = token.symbol || token.metadata?.symbol || token.address.slice(0, 6).toUpperCase();

  // Metrics with optional chaining and defaults
  const marketCap = token.marketCapSol || 35000;
  const volume = token.vSolInBondingCurve?.toFixed(2) || '0.00';
  const topHoldersPercentage = token.top10HoldersPercentage || 0;
  const devWalletPercentage = token.devWalletPercentage || 0;
  const insiderPercentage = token.insiderPercentage;
  const snipersCount = token.snipersCount;
  const holdersCount = token.holdersCount || 0;

  // Calculate market cap progress
  const progressPercentage = calculateMarketCapProgress(marketCap);

  // Event handlers
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
    const googleImagesUrl = `https://www.google.com/search?q=${searchQuery}&tbm=isch`;
    window.open(googleImagesUrl, '_blank', 'noopener,noreferrer');
  };

  const handleTopHoldersClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // TODO: Connect to holders analytics
    console.log('Top holders clicked');
  };

  const getTopHoldersColor = (percentage: number) => {
    return percentage <= 15 
      ? "text-green-400 hover:text-green-300" 
      : "text-red-400 hover:text-red-300";
  };

  const getDevHoldingColor = (percentage: number) => {
    return percentage <= 15
      ? "text-green-400"
      : "text-red-400";
  };

  const getInsiderColor = (percentage: number) => {
    return percentage <= 10
      ? "text-green-400"
      : "text-red-400";
  };

  const getSnipersColor = (count: number) => {
    return count <= 5
      ? "text-green-400"
      : "text-red-400";
  };

  return (
    <Card 
      className={cn(
        "group cursor-pointer transition-all duration-300 cosmic-glow space-gradient",
        "hover:scale-[1.02] hover:shadow-lg hover:shadow-purple-500/20",
        "p-2 relative overflow-hidden"
      )}
      onClick={onClick}
    >
      {/* Ambient Glow Effect */}
      <div className="ambient-glow" />

      <div className="relative p-2">
        <div className="flex items-start gap-3">
          {/* Token Image/Logo Section */}
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
                {/* Search Overlay on Hover */}
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
            {/* Contract Verification Badge */}
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-purple-500/20 rounded-full border border-purple-500/40 flex items-center justify-center">
              <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
            </div>
          </div>

          {/* Token Information Section */}
          <div className="flex-grow min-w-0">
            {/* Token Name and Buy Button */}
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

            {/* Token Metrics Row */}
            <div className="flex items-center justify-between text-xs text-gray-400 mt-0.5 mb-1">
              <div className="flex items-center gap-2">
                {/* Time since launch */}
                <span>4h</span>
                {/* Top holders percentage */}
                <button
                  onClick={handleTopHoldersClick}
                  className={cn(
                    "flex items-center gap-1 transition-colors",
                    getTopHoldersColor(topHoldersPercentage)
                  )}
                >
                  <UserPlus size={13} className="stroke-[2.5]" />
                  <span>{topHoldersPercentage}%</span>
                </button>
                {/* Dev wallet percentage */}
                {devWalletPercentage > 0 && (
                  <span className={cn(
                    "flex items-center gap-1",
                    getDevHoldingColor(devWalletPercentage)
                  )}>
                    <DevHoldingIcon className="current-color" /> {devWalletPercentage}%
                  </span>
                )}
                {/* Insider percentage - Only show if exists */}
                {typeof insiderPercentage !== 'undefined' && insiderPercentage > 0 && (
                  <span className={cn(
                    "flex items-center gap-1",
                    getInsiderColor(insiderPercentage)
                  )}>
                    <InsiderIcon className="current-color" /> {insiderPercentage}%
                  </span>
                )}
                {/* Snipers/bots count - Only show if exists */}
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

            {/* Social Links and Stats */}
            <div className="flex items-center justify-between text-[11px] mt-2">
              {/* Social Media Links */}
              <div className="flex items-center gap-2">
                {/* Project Website */}
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
                {/* Twitter/X Profile */}
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
                {/* Telegram Group/Channel */}
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
                {/* PumpFun Profile */}
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

              {/* Key Metrics */}
              <div className="flex items-center gap-3">
                {/* Total Holders Count */}
                <div className="flex items-center gap-1">
                  <Users size={12} className="text-gray-400" />
                  <span className="text-purple-200">{holdersCount}</span>
                </div>
                {/* 24h Trading Volume */}
                <div className="flex items-center gap-1">
                  <span className="text-gray-400">V</span>
                  <span className="text-purple-200">${volume}</span>
                </div>
                {/* Market Cap */}
                <div className="flex items-center gap-1">
                  <span className="text-gray-400">MC</span>
                  <span className="text-purple-200">${formatMarketCap(marketCap)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Market Cap Progress Bar */}
      <div className="absolute bottom-0 left-0 w-full h-0.5 bg-purple-900/20">
        <div 
          className="h-full bg-gradient-to-r from-purple-500 via-purple-400 to-purple-500 relative overflow-hidden transition-all duration-1000 ease-out"
          style={{ width: `${progressPercentage}%` }}
        >
          {/* Animated Shine Effect */}
          <div className="absolute inset-0 w-full h-full animate-shine">
            <div className="absolute top-0 left-0 w-1/2 h-full bg-gradient-to-r from-transparent via-purple-300/30 to-transparent transform -skew-x-12"></div>
          </div>
        </div>
      </div>
    </Card>
  );
};
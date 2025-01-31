import { FC, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Card } from "@/components/ui/card";
import { ImageIcon, Globe, Search, Users, Crosshair, UserPlus, Copy } from 'lucide-react';
import { validateImageUrl, validateSocialUrl } from '@/utils/validators';
import { THRESHOLDS, getRiskLevelColor, formatMarketCap, calculateMarketCapProgress } from '@/utils/token-metrics';
import { cn } from "@/lib/utils";
import { PumpFunIcon } from './icons/PumpFunIcon';
import { TelegramIcon } from './icons/TelegramIcon';
import { XIcon } from './icons/XIcon';
import { DevHoldingIcon } from './icons/DevHoldingIcon';
import { InsiderIcon } from './icons/InsiderIcon';
import { usePumpPortalStore } from '@/lib/pump-portal-websocket';
import type { Token, TokenTrade } from '@/types/token';
import { formatDistanceToNow } from 'date-fns';

interface TokenCardProps {
  token: Token;
  onClick: () => void;
  onBuyClick?: () => void;
  onCopyAddress?: () => void;
}

interface TokenMetrics {
  marketCapSol: number;
  volume24h: number;
  topHoldersPercentage: number;
  devWalletPercentage: number;
  insiderPercentage: number;
  insiderRisk: number;
  snipersCount: number;
  holdersCount: number;
}

interface InsiderMetrics {
  risk: number;
  patterns: {
    quickFlips: number;
    coordinatedBuys: number;
  };
}

const calculateTokenMetrics = (
  token: Token,
  trades: TokenTrade[],
  creationTimestamp: number
): TokenMetrics => {
  const now = Date.now();
  const oneDayAgo = now - 24 * 60 * 60 * 1000;
  const snipeWindow = creationTimestamp + 15000;

  const volume24h = trades
    .filter(trade => trade.timestamp > oneDayAgo)
    .reduce((sum, trade) => sum + trade.solAmount, 0);

  const holdersMap = new Map<string, number>();
  trades.forEach(trade => {
    if (trade.txType === 'buy') {
      holdersMap.set(trade.traderPublicKey,
        (holdersMap.get(trade.traderPublicKey) || 0) + trade.tokenAmount);
    } else if (trade.txType === 'sell') {
      holdersMap.set(trade.traderPublicKey,
        (holdersMap.get(trade.traderPublicKey) || 0) - trade.tokenAmount);
    }
  });

  Array.from(holdersMap.entries())
    .filter(([_, balance]) => balance <= 0)
    .forEach(([wallet]) => holdersMap.delete(wallet));

  const sortedHolders = Array.from(holdersMap.entries())
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10);

  const totalSupply = token.vTokensInBondingCurve;
  const top10Supply = sortedHolders.reduce((sum, [_, amount]) => sum + amount, 0);
  const topHoldersPercentage = (top10Supply / totalSupply) * 100;

  const devBalance = holdersMap.get(token.devWallet) || 0;
  const devWalletPercentage = (devBalance / totalSupply) * 100;

  const snipers = new Set(
    trades
      .filter(t => t.timestamp <= snipeWindow && t.txType === 'buy')
      .map(t => t.traderPublicKey)
  );

  const insiderWallets = new Set(
    trades
      .filter(t => t.timestamp <= creationTimestamp + 3600000)
      .map(t => t.traderPublicKey)
  );
  insiderWallets.delete(token.devWallet);
  const insiderBalances = Array.from(insiderWallets)
    .reduce((sum, wallet) => sum + (holdersMap.get(wallet) || 0), 0);
  const insiderPercentage = (insiderBalances / totalSupply) * 100;
  const insiderRisk = Math.round(insiderPercentage / 10);

  return {
    marketCapSol: token.vSolInBondingCurve,
    volume24h,
    topHoldersPercentage,
    devWalletPercentage,
    insiderPercentage,
    insiderRisk,
    snipersCount: snipers.size,
    holdersCount: holdersMap.size
  };
};

const getInsiderRiskColor = (metrics: InsiderMetrics) => {
  if (metrics.risk <= 3) return "text-green-400";
  if (metrics.risk <= 6) return "text-yellow-400";
  return "text-red-400";
};

const InsiderMetricsDisplay = ({metrics}: {metrics: InsiderMetrics}) => (
  <div className="flex items-center gap-1">
    <InsiderIcon 
      className={cn(
        "current-color",
        getInsiderRiskColor(metrics)
      )} 
    />
    <span>{metrics.risk}</span>
  </div>
);

export const TokenCard: FC<TokenCardProps> = ({
  token,
  onClick,
  onBuyClick = () => console.log('Buy clicked'),
  onCopyAddress = () => console.log('Address copied')
}) => {
  const [imageError, setImageError] = useState(false);
  const [validatedImageUrl, setValidatedImageUrl] = useState<string | null>(null);
  const [currentProgress, setCurrentProgress] = useState(0);
  const [timeSinceLaunch, setTimeSinceLaunch] = useState<string>('');
  const prevMetricsRef = useRef<TokenMetrics | null>(null);

  const initialMetrics = useMemo(() => calculateTokenMetrics(
    token,
    token.recentTrades || [],
    parseInt(token.createdAt || Date.now().toString())
  ), [token]);

  const [metrics, setMetrics] = useState<TokenMetrics>(initialMetrics);

  useEffect(() => {
    const updateTimeSinceLaunch = () => {
      const createdAt = parseInt(token.createdAt || Date.now().toString());
      const now = Date.now();
      const diffSeconds = Math.floor((now - createdAt) / 1000);

      if (diffSeconds < 60) {
        setTimeSinceLaunch(`${diffSeconds}s`);
      } else if (diffSeconds < 3600) {
        setTimeSinceLaunch(`${Math.floor(diffSeconds / 60)}m`);
      } else if (diffSeconds < 86400) {
        setTimeSinceLaunch(`${Math.floor(diffSeconds / 3600)}h`);
      } else {
        setTimeSinceLaunch(`${Math.floor(diffSeconds / 86400)}d`);
      }
    };

    updateTimeSinceLaunch();
    const interval = setInterval(updateTimeSinceLaunch, 1000);
    return () => clearInterval(interval);
  }, [token.createdAt]);

  useEffect(() => {
    const handleUpdate = (updatedToken: Token | undefined) => {
      if (!updatedToken) return;

      const rawImageUrl = updatedToken.metadata?.imageUrl || updatedToken.imageUrl;
      const processedUrl = validateImageUrl(rawImageUrl);
      setValidatedImageUrl(processedUrl);

      const newMetrics = calculateTokenMetrics(
        updatedToken,
        updatedToken.recentTrades || [],
        parseInt(updatedToken.createdAt || Date.now().toString())
      );

      if (JSON.stringify(prevMetricsRef.current) !== JSON.stringify(newMetrics)) {
        prevMetricsRef.current = newMetrics;
        setMetrics(newMetrics);
      }
    };

    handleUpdate(token);

    const unsubscribe = usePumpPortalStore.subscribe(
      state => state.tokens.find(t => t.address === token.address),
      handleUpdate
    );

    return () => unsubscribe();
  }, [token]);

  useEffect(() => {
    const targetProgress = calculateMarketCapProgress(metrics.marketCapSol);
    setCurrentProgress(prev => {
      const diff = targetProgress - prev;
      return Math.abs(diff) < 0.1 ? targetProgress : prev + diff * 0.1;
    });
  }, [metrics.marketCapSol]);

  const displayName = useMemo(() =>
    token.name || token.metadata?.name || `Token ${token.address.slice(0, 8)}`,
    [token]
  );

  const displaySymbol = useMemo(() =>
    token.symbol || token.metadata?.symbol || token.address.slice(0, 6).toUpperCase(),
    [token]
  );

  const handleImageError = () => {
    setImageError(true);
    const rawImageUrl = token.metadata?.imageUrl || token.imageUrl;
    setValidatedImageUrl(validateImageUrl(rawImageUrl));
  };

  const getTopHoldersColor = (percentage: number) =>
    percentage <= 15 ? "text-green-400 hover:text-green-300" : "text-red-400 hover:text-red-300";

  const getDevHoldingColor = (percentage: number) =>
    percentage <= 15 ? "text-green-400" : "text-red-400";

  const getInsiderColor = (count: number) =>
    count === 0 ? "text-green-400" :
      count <= 4 ? "text-yellow-400" : "text-red-400";

  const getSnipersColor = (count: number) =>
    count <= 5 ? "text-green-400" : "text-red-400";

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

  const socialLinks = useMemo(() => {
    const website = token.website?.trim();
    const telegram = token.telegram?.trim();
    const twitter = token.twitter?.trim();
    const pumpfun = `https://pump.fun/coin/${token.address}`;

    return {
      website: validateSocialUrl(website),
      telegram: validateSocialUrl(telegram),
      twitter: validateSocialUrl(twitter),
      pumpfun
    };
  }, [token]);

  const insiderMetrics: InsiderMetrics = { risk: metrics.insiderRisk, patterns: { quickFlips: 0, coordinatedBuys: 0 } };

  return (
    <Card
      id={`token-${token.address}`}
      className={cn(
        "group cursor-pointer transition-all duration-300 cosmic-glow space-gradient",
        "hover:scale-[1.02] hover:shadow-lg hover:shadow-purple-500/20",
        "p-2 relative overflow-hidden flash-update"
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
                  onError={handleImageError}
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
                <span>{timeSinceLaunch}</span>
                <button
                  className={cn(
                    "flex items-center gap-1 transition-colors",
                    getTopHoldersColor(metrics.topHoldersPercentage)
                  )}
                >
                  <UserPlus size={13} className="stroke-[2.5]" />
                  <span>{metrics.topHoldersPercentage.toFixed(1)}%</span>
                </button>
                {metrics.devWalletPercentage > 0 && (
                  <span className={cn(
                    "flex items-center gap-1",
                    getDevHoldingColor(metrics.devWalletPercentage)
                  )}>
                    <DevHoldingIcon className="current-color" /> {metrics.devWalletPercentage.toFixed(1)}%
                  </span>
                )}
                {metrics.insiderRisk > 0 && (
                  <InsiderMetricsDisplay metrics={insiderMetrics} />
                )}
                {metrics.snipersCount > 0 && (
                  <span className={cn(
                    "flex items-center gap-1",
                    getSnipersColor(metrics.snipersCount)
                  )}>
                    <Crosshair size={12} className="current-color" /> {metrics.snipersCount}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] mt-2">
              <div className="flex items-center gap-2">
                {socialLinks.website && (
                  <a
                    href={socialLinks.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-blue-400/70 hover:text-blue-300 transition-colors"
                    title="Website"
                  >
                    <Globe className="w-4 h-4" />
                  </a>
                )}
                {socialLinks.twitter && (
                  <a
                    href={socialLinks.twitter}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-blue-400/70 hover:text-blue-300 transition-colors"
                    title="Twitter"
                  >
                    <XIcon className="w-4 h-4" />
                  </a>
                )}
                {socialLinks.telegram && (
                  <a
                    href={socialLinks.telegram}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-blue-400/70 hover:text-blue-300 transition-colors"
                    title="Telegram"
                  >
                    <TelegramIcon className="w-4 h-4" />
                  </a>
                )}
                {socialLinks.pumpfun && (
                  <a
                    href={socialLinks.pumpfun}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-blue-400/70 hover:text-blue-300 transition-colors"
                    title="PumpFun"
                  >
                    <PumpFunIcon className="w-4 h-4" />
                  </a>
                )}
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <Users size={12} className="text-gray-400" />
                  <span className="text-purple-200">{metrics.holdersCount}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-gray-400">V</span>
                  <span className="text-purple-200">${metrics.volume24h.toFixed(2)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-gray-400">MC</span>
                  <span className="text-purple-200">${formatMarketCap(metrics.marketCapSol)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 w-full h-0.5 bg-purple-900/20">
        <div
          className="h-full bg-gradient-to-r from-purple-500 via-purple-400 to-purple-500 relative overflow-hidden transition-all duration-1000 ease-out"
          style={{ width: `${currentProgress}%` }}
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
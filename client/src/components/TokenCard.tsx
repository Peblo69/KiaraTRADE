
import { FC, useState, useEffect } from 'react';
import { Card } from "@/components/ui/card";
import { ImageIcon } from 'lucide-react';
import { validateImageUrl } from '@/utils/image-handler';
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface TokenCardProps {
  token: {
    address: string;
    name: string;
    symbol: string;
    priceInUsd?: number;
    marketCapSol?: number;
    solPrice?: number;
    vSolInBondingCurve?: number;
    metadata?: {
      name: string;
      symbol: string;
      uri?: string;
      imageUrl?: string;
    };
    imageUrl?: string;
    recentTrades?: any[];
    isNew?: boolean;
  };
  onClick: () => void;
}

export const TokenCard: FC<TokenCardProps> = ({ token, onClick }) => {
  const [imageError, setImageError] = useState(false);
  const [validatedImageUrl, setValidatedImageUrl] = useState<string | null>(null);

  useEffect(() => {
    const rawImageUrl = token.metadata?.imageUrl || token.imageUrl;
    console.log('[TokenCard] Raw image URL:', rawImageUrl);

    const processedUrl = validateImageUrl(rawImageUrl);
    console.log('[TokenCard] Processed URL:', processedUrl);

    setValidatedImageUrl(processedUrl);
  }, [token]);

  const displayName = token.name || token.metadata?.name || `Token ${token.address.slice(0, 8)}`;
  const displaySymbol = token.symbol || token.metadata?.symbol || token.address.slice(0, 6).toUpperCase();

  const marketCap = token.marketCapSol && token.solPrice 
    ? (token.marketCapSol * token.solPrice).toFixed(2)
    : '0.00';

  const liquidity = token.vSolInBondingCurve && token.solPrice
    ? (token.vSolInBondingCurve * token.solPrice).toFixed(2)
    : '0.00';

  const volume = token.recentTrades?.reduce((acc, trade) => 
    acc + ((trade.solAmount || 0) * (token.solPrice || 0)), 0
  ).toFixed(2) || '0.00';

  return (
    <Card 
      className={cn(
        "group cursor-pointer transition-all duration-300 cosmic-glow space-gradient",
        "hover:scale-[1.02] hover:shadow-lg hover:shadow-purple-500/20",
        "p-2 min-h-[120px]"
      )}
      onClick={onClick}
    >
      <div className="relative p-2 overflow-hidden">
        <div className="flex items-start gap-2">
          {/* Token Image */}
          <div className={cn(
            "w-6 h-6 flex-shrink-0 relative rounded-lg overflow-hidden",
            "bg-gradient-to-br from-purple-900/20 to-black/30",
            "border border-purple-500/20"
          )}>
            {validatedImageUrl && !imageError ? (
              <img
                src={validatedImageUrl}
                alt={displayName}
                className="w-full h-full object-cover transform group-hover:scale-110 transition-all duration-700"
                onError={() => {
                  console.error('[TokenCard] Image failed to load:', validatedImageUrl);
                  setImageError(true);
                }}
                onLoad={() => {
                  console.log('[TokenCard] Image loaded successfully:', validatedImageUrl);
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center animate-pulse">
                <span className="text-2xl font-bold text-purple-400/70">
                  {displaySymbol[0] || <ImageIcon className="w-8 h-8 text-purple-400/50" />}
                </span>
              </div>
            )}
          </div>

          {/* Token Info */}
          <div className="flex-grow space-y-4">
            <div>
              <div className="flex items-center gap-1">
                <h3 className="text-sm font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-200 to-purple-400">
                  {displaySymbol}
                </h3>
                <Badge 
                  variant={token.isNew ? "default" : "secondary"}
                  className={cn(
                    "h-4 px-1 text-xs",
                    token.isNew && "bg-purple-500/20 text-purple-200 border border-purple-500/40"
                  )}
                >
                  {token.isNew ? "New" : "Listed"}
                </Badge>
              </div>
              <p className="text-xs text-gray-400 truncate mt-0.5">
                {displayName}
              </p>
            </div>

            {/* Price */}
            <div className="bg-purple-500/5 p-2 rounded-lg border border-purple-500/20">
              <div className="text-xs text-gray-400">Price</div>
              <div className="text-sm font-bold text-purple-100">
                ${token.priceInUsd?.toFixed(8) || '0.00000000'}
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-2 pt-1 mt-1 border-t border-purple-500/20">
              <div className="text-center">
                <div className="text-[10px] text-gray-400">Market Cap</div>
                <div className="font-medium text-xs text-purple-200">${marketCap}</div>
              </div>
              <div className="text-center">
                <div className="text-[10px] text-gray-400">Liquidity</div>
                <div className="font-medium text-xs text-purple-200">${liquidity}</div>
              </div>
              <div className="text-center">
                <div className="text-[10px] text-gray-400">Volume</div>
                <div className="font-medium text-xs text-purple-200">${volume}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default TokenCard;

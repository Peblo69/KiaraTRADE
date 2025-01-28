import { FC, useState, useEffect } from 'react';
import { Card } from "@/components/ui/card";
import { ImageIcon } from 'lucide-react';
import { validateImageUrl } from '@/utils/image-handler';
import { Badge } from "@/components/ui/badge";

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

  // Calculate market stats
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
      className="group cursor-pointer hover:scale-[1.02] transition-all duration-300"
      onClick={onClick}
    >
      <div className="flex items-start p-4 gap-4">
        {/* Image Section - Now as a smaller square */}
        <div className="w-16 h-16 flex-shrink-0 relative overflow-hidden bg-gradient-to-br from-purple-900/10 to-black/20 rounded-lg">
          {validatedImageUrl && !imageError ? (
            <img
              src={validatedImageUrl}
              alt={displayName}
              className="w-full h-full object-cover transform group-hover:scale-110 transition-all duration-500"
              onError={() => {
                console.error('[TokenCard] Image failed to load:', validatedImageUrl);
                setImageError(true);
              }}
              onLoad={() => {
                console.log('[TokenCard] Image loaded successfully:', validatedImageUrl);
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-xl font-bold text-purple-400">
                {displaySymbol[0] || <ImageIcon className="w-8 h-8 text-purple-400/50" />}
              </span>
            </div>
          )}
        </div>

        {/* Content Section */}
        <div className="flex-grow space-y-4">
          {/* Token Info */}
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold text-purple-100">
                  {displaySymbol}
                </h3>
                <Badge 
                  variant={token.isNew ? "default" : "secondary"}
                  className="h-5"
                >
                  {token.isNew ? "New" : "Listed"}
                </Badge>
              </div>
              <p className="text-sm text-gray-400 truncate">
                {displayName}
              </p>
            </div>
          </div>

          {/* Price */}
          <div className="bg-purple-500/5 p-2 rounded-lg">
            <div className="text-sm text-gray-400">Current Price</div>
            <div className="text-lg font-bold text-purple-100">
              ${token.priceInUsd?.toFixed(8) || '0.00000000'}
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-purple-500/10">
            <div className="text-center">
              <div className="text-xs text-gray-400">Market Cap</div>
              <div className="font-medium text-sm">${marketCap}</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-400">Liquidity</div>
              <div className="font-medium text-sm">${liquidity}</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-400">Volume</div>
              <div className="font-medium text-sm">${volume}</div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default TokenCard;
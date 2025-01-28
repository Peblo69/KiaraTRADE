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
      {/* Image Section - Now with square aspect ratio */}
      <div className="aspect-square w-full relative overflow-hidden bg-gradient-to-br from-purple-900/10 to-black/20">
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
            <div className="w-24 h-24 bg-purple-500/10 backdrop-blur-sm flex items-center justify-center">
              <span className="text-3xl font-bold text-purple-400">
                {displaySymbol[0] || <ImageIcon className="w-12 h-12 text-purple-400/50" />}
              </span>
            </div>
          </div>
        )}

        {/* Token badge overlay */}
        <div className="absolute top-4 right-4">
          <Badge 
            variant={token.isNew ? "default" : "secondary"}
            className="backdrop-blur-sm bg-black/40"
          >
            {token.isNew ? "New Token" : "Listed"}
          </Badge>
        </div>
      </div>

      {/* Content Section */}
      <div className="p-4 space-y-4">
        {/* Token Info */}
        <div>
          <h3 className="text-lg font-semibold text-purple-100">
            {displaySymbol}
          </h3>
          <p className="text-sm text-gray-400 truncate">
            {displayName}
          </p>
        </div>

        {/* Price */}
        <div className="bg-purple-500/5 p-3 rounded-lg">
          <div className="text-sm text-gray-400 mb-1">Current Price</div>
          <div className="text-xl font-bold text-purple-100">
            ${token.priceInUsd?.toFixed(8) || '0.00000000'}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-purple-500/10">
          <div className="text-center">
            <div className="text-xs text-gray-400 mb-1">Market Cap</div>
            <div className="font-medium text-sm">${marketCap}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-gray-400 mb-1">Liquidity</div>
            <div className="font-medium text-sm">${liquidity}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-gray-400 mb-1">Volume</div>
            <div className="font-medium text-sm">${volume}</div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default TokenCard;
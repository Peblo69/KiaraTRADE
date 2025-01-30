import { FC, useState, useEffect } from 'react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ImageIcon } from 'lucide-react';
import { validateImageUrl } from '@/utils/image-handler';
import { cn } from "@/lib/utils";
import type { PumpPortalToken } from '@/lib/pump-portal-websocket';

interface TokenCardProps {
  token: PumpPortalToken;
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

  return (
    <Card 
      className={cn(
        "group cursor-pointer transition-all duration-300 space-gradient",
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
              <div className="w-full h-full flex items-center justify-center">
                <ImageIcon className="w-4 h-4 text-purple-400/50" />
              </div>
            )}
          </div>

          {/* Token Info */}
          <div className="flex-grow">
            <div className="flex items-center gap-1">
              <h3 className="text-sm font-bold text-purple-200">
                {displaySymbol}
              </h3>
              <Badge 
                variant="secondary"
                className="h-4 px-1 text-xs bg-purple-500/20 text-purple-200"
              >
                {token.isNew ? "New" : "Listed"}
              </Badge>
            </div>
            <p className="text-xs text-gray-400 truncate mt-0.5">
              {displayName}
            </p>

            {/* Price */}
            <div className="mt-2">
              <div className="text-xs text-gray-400">Price</div>
              <div className="text-sm font-bold text-purple-100">
                ${token.priceInUsd?.toFixed(8) || '0.00000000'}
              </div>
            </div>

            {/* Market Cap */}
            <div className="mt-1">
              <div className="text-xs text-gray-400">Market Cap</div>
              <div className="text-sm font-bold text-purple-100">
                ${(token.marketCapSol * (token.solPrice || 0)).toFixed(2)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default TokenCard;
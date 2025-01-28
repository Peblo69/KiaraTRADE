import { FC, useState, useEffect } from 'react';
import { Card } from "@/components/ui/card";
import { ImageIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { validateImageUrl } from '@/utils/image-handler';
import { formatNumber } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface TokenCardProps {
  token: {
    address: string;
    name: string;
    symbol: string;
    price?: number;
    marketCapSol?: number;
    priceInUsd?: number;
    metadata?: {
      name: string;
      symbol: string;
      uri?: string;
      imageUrl?: string;
    };
    imageUrl?: string;
    isNew?: boolean;
  };
  onClick: () => void;
}

export const TokenCard: FC<TokenCardProps> = ({ token, onClick }) => {
  const [imageError, setImageError] = useState(false);
  const [validatedImageUrl, setValidatedImageUrl] = useState<string | null>(null);

  // Price change calculation (for demo)
  const priceChange = {
    value: 5.2,
    isPositive: true
  };

  useEffect(() => {
    // Get image URL from token data
    const rawImageUrl = token.metadata?.imageUrl || token.imageUrl;
    console.log('[TokenCard] Raw image URL:', rawImageUrl);

    // Validate and process the URL
    const processedUrl = validateImageUrl(rawImageUrl);
    console.log('[TokenCard] Processed URL:', processedUrl);

    setValidatedImageUrl(processedUrl);
  }, [token]);

  const displayName = token.name || token.metadata?.name || `Token ${token.address.slice(0, 8)}`;
  const displaySymbol = token.symbol || token.metadata?.symbol || token.address.slice(0, 6).toUpperCase();
  const displayPrice = token.priceInUsd || 0;

  return (
    <Card 
      onClick={onClick}
      className="group hover:scale-[1.02] transition-all duration-300 cursor-pointer overflow-hidden bg-black/20"
    >
      <div className="relative">
        {/* Image Section */}
        <div className="aspect-square w-full overflow-hidden bg-gradient-to-br from-purple-900/10 to-purple-800/10">
          {validatedImageUrl && !imageError ? (
            <img
              src={validatedImageUrl}
              alt={displayName}
              className="w-full h-full object-cover transform group-hover:scale-105 transition-all duration-500"
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
              <div className="w-20 h-20 rounded-full bg-purple-800/30 flex items-center justify-center backdrop-blur-sm">
                <span className="text-3xl font-bold text-purple-500/50">
                  {displaySymbol[0] || <ImageIcon className="w-10 h-10" />}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Content Section */}
        <div className="p-4 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-lg text-purple-100 group-hover:text-purple-300 transition-colors">
                  {displaySymbol}
                </h3>
                {token.isNew && (
                  <Badge variant="default" className="bg-purple-500/20 text-purple-300">
                    New
                  </Badge>
                )}
              </div>
              <p className="text-sm text-gray-400 truncate max-w-[200px]">
                {displayName}
              </p>
            </div>
            <div className={`flex items-center gap-1 ${
              priceChange.isPositive ? 'text-green-500' : 'text-red-500'
            }`}>
              {priceChange.isPositive ? 
                <TrendingUp className="w-4 h-4" /> : 
                <TrendingDown className="w-4 h-4" />
              }
              <span className="text-sm font-medium">
                {priceChange.value.toFixed(2)}%
              </span>
            </div>
          </div>

          {/* Price and Market Cap */}
          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-purple-500/10">
            <div>
              <p className="text-xs text-gray-400 mb-1">Price</p>
              <p className="font-medium text-purple-100">
                ${formatNumber(displayPrice)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">Market Cap</p>
              <p className="font-medium text-purple-100">
                {token.marketCapSol ? 
                  `${formatNumber(token.marketCapSol)} SOL` : 
                  'N/A'
                }
              </p>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default TokenCard;
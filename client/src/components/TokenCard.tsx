import { useState, useEffect } from 'react';
import { TokenSecurityButton } from "@/components/TokenSecurityButton";
import { formatNumber } from "@/lib/utils";
import { FuturisticText } from "@/components/FuturisticText";
import { usePumpPortalStore } from "@/lib/pump-portal-websocket";
import { ImageIcon } from 'lucide-react';

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
  };
  analytics?: any;
}

export function TokenCard({ token, analytics }: TokenCardProps) {
    const [imageError, setImageError] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // Debug logs
    useEffect(() => {
        console.log('TokenCard rendered with token:', {
            address: token.address,
            imageUrl: token.metadata?.imageUrl,
            directImageUrl: token.imageUrl,
            metadata: token.metadata
        });
    }, [token]);

    const imageUrl = token.metadata?.imageUrl || token.imageUrl;
    const displayName = token.name || token.metadata?.name || `Token ${token.address.slice(0, 8)}`;
    const displaySymbol = token.symbol || token.metadata?.symbol || token.address.slice(0, 6).toUpperCase();
    const displayPrice = token.priceInUsd || 0;

    return (
        <div className="p-4 rounded-lg border border-purple-500/20 bg-purple-900/10 hover:border-purple-500/40 transition-all duration-300">
            {/* Image Container - This is the part that creates the circular placeholder */}
            <div className="aspect-square mb-4 rounded-lg overflow-hidden bg-purple-900/20 relative">
                {imageUrl && !imageError ? (
                    <img
                        src={imageUrl}
                        alt={displayName}
                        className={`w-full h-full object-cover transform hover:scale-105 transition-all duration-300 ${
                            isLoading ? 'opacity-0' : 'opacity-100'
                        }`}
                        onLoad={() => {
                            console.log('TokenCard: Image loaded successfully:', imageUrl);
                            setIsLoading(false);
                        }}
                        onError={(e) => {
                            console.error('TokenCard: Image failed to load:', imageUrl);
                            setImageError(true);
                            setIsLoading(false);
                        }}
                    />
                ) : (
                    // This is the circular placeholder you're seeing
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-900/20 to-purple-800/20">
                        <div className="w-16 h-16 rounded-full bg-purple-800/30 flex items-center justify-center">
                            {displaySymbol[0] || <ImageIcon className="w-8 h-8 text-purple-500/50" />}
                        </div>
                    </div>
                )}

                {/* Loading overlay */}
                {isLoading && imageUrl && (
                    <div className="absolute inset-0 bg-purple-900/20 flex items-center justify-center">
                        <div className="animate-pulse w-8 h-8 rounded-full bg-purple-500/50" />
                    </div>
                )}
            </div>

            {/* Token Info */}
            <div className="mb-2">
                <div className="text-lg font-semibold text-purple-300">
                    {displayName}
                </div>
                <FuturisticText variant="div" className="text-sm text-muted-foreground mt-1">
                    {displaySymbol}
                </FuturisticText>
            </div>

            {/* Price Information */}
            <div className="space-y-1">
                <div className="text-sm text-muted-foreground">💎 Price</div>
                <div className="font-medium">
                    ${formatNumber(displayPrice)}
                </div>
            </div>

            {/* Market Cap if available */}
            {token.marketCapSol && token.marketCapSol > 0 && (
                <div className="mt-2 space-y-1">
                    <div className="text-sm text-muted-foreground">📊 Market Cap</div>
                    <div className="font-medium">{formatNumber(token.marketCapSol)} SOL</div>
                </div>
            )}

            <TokenSecurityButton tokenAddress={token.address} className="mt-4" />
        </div>
    );
}
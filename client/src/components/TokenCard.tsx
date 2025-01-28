import { useState, useEffect } from 'react';
import { TokenSecurityButton } from "@/components/TokenSecurityButton";
import { formatNumber } from "@/lib/utils";
import { FuturisticText } from "@/components/FuturisticText";
import { usePumpPortalStore } from "@/lib/pump-portal-websocket";
import { Globe } from 'lucide-react';

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
  };
  analytics?: any;
}

export function TokenCard({ token, analytics }: TokenCardProps) {
    const [imageError, setImageError] = useState(false);

    // Enhanced debugging logs
    useEffect(() => {
        console.log('TokenCard: Full token data:', token);
        console.log('TokenCard: Metadata:', token.metadata);
        console.log('TokenCard: Image URL:', token.metadata?.imageUrl);
    }, [token]);

    // Use metadata if available, otherwise fallback to token properties
    const displayName = token.metadata?.name || token.name;
    const displaySymbol = token.metadata?.symbol || token.symbol;
    const displayPrice = token.priceInUsd || 0;
    const imageUrl = token.metadata?.imageUrl;

    return (
        <div className="p-4 rounded-lg border border-purple-500/20 bg-purple-900/10 hover:border-purple-500/40 transition-all duration-300">
            {/* Image Container */}
            <div className="aspect-square mb-4 rounded-lg overflow-hidden bg-purple-900/20">
                {imageUrl && !imageError ? (
                    <img
                        src={imageUrl}
                        alt={displayName}
                        className="w-full h-full object-cover transform hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                            console.error('TokenCard: Image failed to load:', imageUrl);
                            setImageError(true);
                        }}
                        onLoad={() => {
                            console.log('TokenCard: Image loaded successfully:', imageUrl);
                        }}
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <span className="text-3xl font-bold text-purple-500/50">
                            {displaySymbol?.[0] || '?'}
                        </span>
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
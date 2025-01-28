import { useState, useEffect } from 'react';
import { TokenSecurityButton } from "@/components/TokenSecurityButton";
import { formatNumber } from "@/lib/utils";
import { FuturisticText } from "@/components/FuturisticText";

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
    const [displayMethod, setDisplayMethod] = useState<'img'|'background'|'picture'|'fallback'>('img');
    const imageUrl = token.metadata?.imageUrl || token.imageUrl;

    const handleImageError = () => {
        if (displayMethod === 'img') {
            console.log('TokenCard: Switching to background method');
            setDisplayMethod('background');
        } else if (displayMethod === 'background') {
            console.log('TokenCard: Switching to picture method');
            setDisplayMethod('picture');
        } else {
            console.log('TokenCard: All methods failed, using fallback');
            setDisplayMethod('fallback');
        }
    };

    return (
        <div className="p-4 rounded-lg border border-purple-500/20 bg-purple-900/10 hover:border-purple-500/40 transition-all duration-300">
            {/* Image Container */}
            <div className="aspect-square mb-4 rounded-lg overflow-hidden bg-purple-900/20">
                {displayMethod === 'img' && imageUrl && (
                    <img
                        src={imageUrl}
                        alt={token.name}
                        className="w-full h-full object-cover"
                        onError={handleImageError}
                    />
                )}

                {displayMethod === 'background' && imageUrl && (
                    <div 
                        className="w-full h-full bg-cover bg-center"
                        style={{ backgroundImage: `url(${imageUrl})` }}
                        onError={handleImageError}
                    />
                )}

                {displayMethod === 'picture' && imageUrl && (
                    <picture onError={handleImageError}>
                        <source srcSet={imageUrl} type="image/png" />
                        <source srcSet={imageUrl} type="image/jpeg" />
                        <img
                            src={imageUrl}
                            alt={token.name}
                            className="w-full h-full object-cover"
                        />
                    </picture>
                )}

                {displayMethod === 'fallback' && (
                    <div className="w-full h-full flex items-center justify-center">
                        <span className="text-3xl font-bold text-purple-500/50">
                            {token.symbol?.[0] || '?'}
                        </span>
                    </div>
                )}
            </div>

            {/* Token Info */}
            <div className="mb-2">
                <div className="text-lg font-semibold text-purple-300">
                    {token.name}
                </div>
                <FuturisticText variant="div" className="text-sm text-muted-foreground mt-1">
                    {token.symbol}
                </FuturisticText>
            </div>

            {/* Price Information */}
            <div className="space-y-1">
                <div className="text-sm text-muted-foreground">💎 Price</div>
                <div className="font-medium">
                    ${formatNumber(token.priceInUsd || 0)}
                </div>
            </div>

            {/* Market Cap */}
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
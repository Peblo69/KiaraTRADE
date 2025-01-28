
import { useState, useEffect } from 'react';
import { TokenSecurityButton } from "@/components/TokenSecurityButton";
import { formatNumber } from "@/lib/utils";
import { FuturisticText } from "@/components/FuturisticText";
import { validateImageUrl } from '@/utils/image-handler';

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
    const [finalImageUrl, setFinalImageUrl] = useState<string | null>(null);

    // Get image URL from either metadata or direct property
    const rawImageUrl = token.metadata?.imageUrl || token.imageUrl;

    useEffect(() => {
        // Reset states when token changes
        setImageError(false);
        setIsLoading(true);

        const validateAndSetImage = async () => {
            if (rawImageUrl) {
                try {
                    // Validate the image URL
                    const isValid = await validateImageUrl(rawImageUrl);
                    if (isValid) {
                        setFinalImageUrl(rawImageUrl);
                        setImageError(false);
                    } else {
                        setImageError(true);
                        console.error('TokenCard: Invalid image URL:', rawImageUrl);
                    }
                } catch (error) {
                    setImageError(true);
                    console.error('TokenCard: Error validating image:', error);
                }
            } else {
                setImageError(true);
            }
            setIsLoading(false);
        };

        validateAndSetImage();
    }, [rawImageUrl, token]);

    return (
        <div className="p-4 rounded-lg border border-purple-500/20 bg-purple-900/10 hover:border-purple-500/40 transition-all duration-300">
            {/* Image Container */}
            <div className="aspect-square mb-4 rounded-lg overflow-hidden bg-purple-900/20 relative">
                {finalImageUrl && !imageError ? (
                    <>
                        {isLoading && (
                            <div className="absolute inset-0 flex items-center justify-center bg-purple-900/20">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
                            </div>
                        )}
                        <img
                            src={finalImageUrl}
                            alt={token.name}
                            className={`w-full h-full object-cover transform hover:scale-105 transition-transform duration-300 ${
                                isLoading ? 'opacity-0' : 'opacity-100'
                            }`}
                            onLoad={() => {
                                console.log('TokenCard: Image loaded successfully:', finalImageUrl);
                                setIsLoading(false);
                            }}
                            onError={() => {
                                console.error('TokenCard: Image failed to load:', finalImageUrl);
                                setImageError(true);
                                setIsLoading(false);
                            }}
                        />
                    </>
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center">
                        <span className="text-3xl font-bold text-purple-500/50">
                            {token.symbol?.[0] || '?'}
                        </span>
                        <span className="text-xs text-purple-400/50 mt-2">
                            {imageError ? 'Failed to load image' : 'No image URL available'}
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
            <div className="mt-4 space-y-1">
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

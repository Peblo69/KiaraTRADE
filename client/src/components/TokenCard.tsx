import { useState, useEffect } from 'react';
import { TokenSecurityButton } from "@/components/TokenSecurityButton";
import { formatNumber } from "@/lib/utils";
import { usePumpPortalStore } from "@/lib/pump-portal-websocket";
import { getCachedImage, cacheImage } from '@/utils/imageCache';
import { Skeleton } from '@/components/ui/skeleton';
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
    const [loading, setLoading] = useState(true);
    const displayName = token.metadata?.name || token.name;
    const displaySymbol = token.metadata?.symbol || token.symbol;
    const imageUrl = token.metadata?.imageUrl || getCachedImage(token.address);

    useEffect(() => {
        if (token.metadata?.imageUrl) {
            cacheImage(token.address, token.metadata.imageUrl);
            setLoading(false);
        }
    }, [token.metadata?.imageUrl, token.address]);

    return (
        <div className="p-4 rounded-lg border border-purple-500/20 bg-purple-900/10 hover:border-purple-500/40 transition-all duration-300">
            {/* Token Image */}
            <div className="mb-4 aspect-square relative rounded-lg overflow-hidden bg-purple-900/20">
                {loading ? (
                    <Skeleton className="w-full h-full" />
                ) : imageUrl ? (
                    <img
                        src={imageUrl}
                        alt={displayName}
                        className="w-full h-full object-cover transform hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                            console.error('Image failed to load:', imageUrl);
                            e.currentTarget.src = '/fallback-token-image.png';
                        }}
                        loading="eager" // Forces immediate loading
                    />
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-purple-500/50">
                        {token.symbol?.charAt(0) || '?'}
                    </div>
                )}
            </div>

            {/* Token Info */}
            <div className="space-y-4">
                {/* Name and Symbol */}
                <div>
                    <h3 className="text-lg font-semibold text-purple-300">{displayName}</h3>
                    <p className="text-sm text-purple-400/60">{displaySymbol}</p>
                </div>

                {/* Price and Market Cap */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <p className="text-sm text-purple-400/60">Price</p>
                        <p className="text-lg font-semibold">
                            ${formatNumber(token.priceInUsd || 0)}
                        </p>
                    </div>
                    {token.marketCapSol && (
                        <div>
                            <p className="text-sm text-purple-400/60">Market Cap</p>
                            <p className="text-lg font-semibold">
                                {formatNumber(token.marketCapSol)} SOL
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Security Button */}
            <TokenSecurityButton tokenAddress={token.address} className="mt-4" />

            {analytics && (
                <div className="mt-4">
                    {/* Analytics details here */}
                </div>
            )}
        </div>
    );
}
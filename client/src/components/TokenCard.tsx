import { useEffect, useState } from 'react';
import { TokenSecurityButton } from "@/components/TokenSecurityButton";
import { formatNumber } from "@/lib/utils";
import { FuturisticText } from "@/components/FuturisticText";
import { usePumpPortalStore } from "@/lib/pump-portal-websocket";
import { useTokenImageStore, fetchTokenImage } from '@/lib/token-image-handler';
import { Skeleton } from '@/components/ui/skeleton';
import { Globe, ImageIcon } from 'lucide-react';

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
    };
  };
  analytics?: any;
}

export function TokenCard({ token, analytics }: TokenCardProps) {
  const [imageLoading, setImageLoading] = useState(true);
  const [metadata, setMetadata] = useState<any>(null);
  const tokenImage = useTokenImageStore(state => state.getTokenImage(token.address));
  const setTokenImage = useTokenImageStore(state => state.setTokenImage);
  const fetchTokenUri = usePumpPortalStore(state => state.fetchTokenUri);

  // Try to fetch image if not in store
  useEffect(() => {
    async function getImage() {
      if (!tokenImage && token.metadata?.uri) {
        try {
          const imageUrl = await fetchTokenImage(token.metadata.uri);
          if (imageUrl) {
            setTokenImage(token.address, imageUrl);
          }
        } catch (error) {
          console.error('Failed to fetch image:', error);
        }
      }
    }
    getImage();
  }, [token.address, token.metadata?.uri, tokenImage]);

  // Fetch URI if not available
  useEffect(() => {
    async function getUri() {
      if (token.address && !token.metadata?.uri) {
        console.log('Fetching URI for token:', token.address);
        const uri = await fetchTokenUri(token.address);
        if (uri) {
          console.log('Found URI:', uri);
        }
      }
    }
    getUri();
  }, [token.address]);

  useEffect(() => {
    const fetchMetadata = async () => {
      if (token.metadata?.uri) {
        try {
          setLoading(true);
          const data = await fetchTokenMetadataFromUri(token.metadata.uri);
          if (data) {
            setMetadata(data);
          }
        } catch (error) {
          console.error('Error fetching token metadata:', error);
        } finally {
          setLoading(false);
        }
      }
    };

    fetchMetadata();
  }, [token.metadata?.uri]);

  const [loading, setLoading] = useState(true);
  return (
    <div className="group p-4 rounded-lg border border-purple-500/20 bg-purple-900/10 hover:border-purple-500/40 transition-all duration-300">
      {/* Image Container */}
      <div className="aspect-square mb-4 rounded-lg overflow-hidden bg-purple-900/20">
        {tokenImage ? (
          <img
            src={tokenImage}
            alt={token.name}
            className={`w-full h-full object-cover transition-opacity duration-300 ${
              imageLoading ? 'opacity-0' : 'opacity-100'
            }`}
            onLoad={() => setImageLoading(false)}
            onError={(e) => {
              setImageLoading(false);
              e.currentTarget.src = '/placeholder.png'; // Add a placeholder image
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-2xl font-bold text-purple-500/50">
              {token.symbol?.[0] || '?'}
            </span>
          </div>
        )}
      </div>

      {/* Token Info */}
      <div className="space-y-4">
        {/* Name and Symbol */}
        <div>
          <h3 className="text-lg font-semibold text-purple-300">
            {metadata?.name || token.name}
          </h3>
          <p className="text-sm text-purple-400/60">
            {metadata?.symbol || token.symbol}
          </p>
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

        {/* Links */}
        {metadata?.website && (
          <a
            href={metadata.website}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-purple-400 hover:text-purple-300 transition-colors"
          >
            <Globe className="w-4 h-4" />
            Website
          </a>
        )}
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
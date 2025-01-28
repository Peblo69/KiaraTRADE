import { FC, useState, useEffect } from 'react';
import { Card } from "@/components/ui/card";
import { ImageIcon, TrendingUp, TrendingDown, Activity } from 'lucide-react';
import { validateImageUrl } from '@/utils/image-handler';
import { Badge } from "@/components/ui/badge";

interface TokenCardProps {
  token: {
    address: string;
    name: string;
    symbol: string;
    price?: number;
    marketCapSol?: number;
    priceInUsd?: number;
    solPrice?: number; // Added for market cap calculation
    vSolInBondingCurve?: number; // Added for liquidity calculation
    recentTrades?: any[]; // Added for volume and trade count calculation
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

  // Price change calculation (for demo -  needs to be replaced with actual data)
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
      className="hover:bg-purple-500/5 transition-all duration-300 cursor-pointer group border-purple-500/20"
      onClick={onClick}
    >
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <img
              src={validatedImageUrl || 'https://via.placeholder.com/150'}
              alt={`${token.symbol} logo`}
              className="w-10 h-10 rounded-full object-cover bg-purple-500/20"
              loading="lazy"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://via.placeholder.com/150';
              }}
            />
            <div>
              <div className="font-medium group-hover:text-purple-400 transition-colors flex items-center gap-2">
                {token.symbol}
                <Badge variant={token.isNew ? "default" : "outline"} className="h-5">
                  {token.isNew ? "New" : "Listed"}
                </Badge>
              </div>
              <div className="text-sm text-muted-foreground">
                {token.name}
              </div>
            </div>
          </div>
          <div className={`flex items-center gap-1 ${
            priceChange.isPositive ? 'text-green-500' : 'text-red-500'
          }`}>
            {priceChange.isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            <span className="text-sm font-medium">
              {priceChange.value.toFixed(2)}%
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-sm text-muted-foreground">Price</div>
            <div className="font-medium">${token.priceInUsd?.toFixed(8) || '0.00'}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Market Cap</div>
            <div className="font-medium">${(token.marketCapSol * token.solPrice)?.toFixed(2) || '0.00'}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Liquidity</div>
            <div className="font-medium">${(token.vSolInBondingCurve * token.solPrice)?.toFixed(2) || '0.00'}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Volume</div>
            <div className="font-medium">
              ${token.recentTrades?.reduce((acc: number, trade: any) => 
                acc + (trade.solAmount * token.solPrice), 0)?.toFixed(2) || '0.00'}
            </div>
          </div>
        </div>

        <div className="mt-4 border-t border-border/50 pt-4">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Activity className="w-4 h-4" />
              <span>Trades: {token.recentTrades?.length || 0}</span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default TokenCard;
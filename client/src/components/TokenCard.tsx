import { FC } from 'react';
import { Card } from "@/components/ui/card";
import { formatNumber } from "@/lib/utils";
import { RugcheckButton } from "@/components/ui/rugcheck-button";

interface TokenCardProps {
  token: {
    address: string;
    symbol: string;
    price: number;
    marketCap: number;
    volume: number;
    liquidity: number;
    imageUrl?: string;
  };
  onClick?: () => void;
}

export const TokenCard: FC<TokenCardProps> = ({ token, onClick }) => {
  return (
    <Card 
      className="hover:bg-purple-500/5 transition-all duration-300 cursor-pointer group border-purple-500/20"
      onClick={onClick}
    >
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <img
              src={token.imageUrl || 'https://via.placeholder.com/150'}
              alt={`${token.symbol} logo`}
              className="w-10 h-10 rounded-full object-cover bg-purple-500/20"
              loading="lazy"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://via.placeholder.com/150';
              }}
            />
            <div>
              <div className="font-medium group-hover:text-purple-400 transition-colors">
                {token.symbol}
              </div>
              <div className="text-sm text-muted-foreground">
                {token.address.slice(0, 4)}...{token.address.slice(-4)}
              </div>
            </div>
          </div>
          <RugcheckButton mint={token.address} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-sm text-muted-foreground">Price</div>
            <div className="font-medium">${formatNumber(token.price)}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Market Cap</div>
            <div className="font-medium">${formatNumber(token.marketCap)}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Liquidity</div>
            <div className="font-medium">${formatNumber(token.liquidity)}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Volume</div>
            <div className="font-medium">${formatNumber(token.volume)}</div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default TokenCard;
import { FC } from 'react';
import { Card } from "@/components/ui/card";
import { Token } from '@/types/token';

interface TokenCardProps {
  token: Token;
  onClick: () => void;
}

export const TokenCard: FC<TokenCardProps> = ({ token, onClick }) => {
  const displayName = token.name || token.metadata?.name || `Token ${token.address.slice(0, 8)}`;
  const displaySymbol = token.symbol || token.metadata?.symbol || token.address.slice(0, 6).toUpperCase();

  return (
    <Card 
      className="p-4 cursor-pointer hover:bg-gray-800/50 transition-colors"
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold">{displaySymbol}</h3>
          <p className="text-sm text-gray-400">{displayName}</p>
        </div>
        {token.priceInUsd && (
          <div className="text-right">
            <div className="text-sm">${token.priceInUsd.toFixed(8)}</div>
            {token.marketCapSol && (
              <div className="text-xs text-gray-400">
                MC: {token.marketCapSol.toFixed(2)} SOL
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
};

export default TokenCard;
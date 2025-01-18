import { FC, memo } from 'react';
import { Card } from '@/components/ui/card';
import { SiSolana } from 'react-icons/si';

interface TokenCardProps {
  address: string;
  name: string;
  symbol: string;
  price: number;
  volume24h: number;
  marketCap: number;
  imageUrl?: string;
}

const formatNumber = (num: number) => {
  if (num >= 1000000000) return `${(num / 1000000000).toFixed(2)}B`;
  if (num >= 1000000) return `${(num / 1000000).toFixed(2)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(2)}K`;
  return num.toFixed(2);
};

const TokenCard: FC<TokenCardProps> = memo(({
  name,
  symbol,
  price,
  volume24h,
  marketCap,
  imageUrl,
  address
}) => {
  return (
    <Card className="p-4 bg-black/40 backdrop-blur-lg border border-gray-800 hover:border-blue-500/50 transition-all duration-300">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-900">
            {imageUrl && (
              <img
                src={imageUrl}
                alt={symbol}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.src = 'https://cryptologos.cc/logos/solana-sol-logo.png?v=024';
                }}
              />
            )}
          </div>
          <div>
            <h3 className="font-bold text-white">{name}</h3>
            <p className="text-sm text-gray-400">{symbol}</p>
          </div>
        </div>
        <a
          href={`https://solscan.io/token/${address}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-gray-400 hover:text-blue-400 transition-colors"
        >
          <SiSolana size={20} />
        </a>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <p className="text-sm text-gray-400">Price</p>
          <p className="font-bold text-white">{price.toFixed(6)} SOL</p>
        </div>
        <div>
          <p className="text-sm text-gray-400">Volume 24h</p>
          <p className="font-bold text-white">{formatNumber(volume24h)} SOL</p>
        </div>
        <div>
          <p className="text-sm text-gray-400">Market Cap</p>
          <p className="font-bold text-white">{formatNumber(marketCap)} SOL</p>
        </div>
      </div>
    </Card>
  );
});

TokenCard.displayName = 'TokenCard';

export default TokenCard;
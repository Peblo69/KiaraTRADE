import { FC, memo, useState, useMemo } from 'react';
import { Card } from "@/components/ui/card";
import { SiSolana } from 'react-icons/si';
import { 
  ExternalLink, 
  TrendingUp, 
  Users, 
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Globe,
  TwitterIcon
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useTokenVolumeStore } from '@/lib/token-volume';
import { useTokenPriceStore } from '@/lib/price-history';
import { TransactionHistory } from './TransactionHistory';
import { CandlestickChart } from './CandlestickChart';

// SOL price in USD (this should be fetched from an API in production)
const SOL_PRICE_USD = 104.23;

const formatNumber = (num: number, isCurrency = false) => {
  if (num >= 1000000000) return `${isCurrency ? '$' : ''}${(num / 1000000000).toFixed(2)}B`;
  if (num >= 1000000) return `${isCurrency ? '$' : ''}${(num / 1000000).toFixed(2)}M`;
  if (num >= 1000) return `${isCurrency ? '$' : ''}${(num / 1000).toFixed(2)}K`;
  return `${isCurrency ? '$' : ''}${num.toFixed(2)}`;
};

interface TokenCardProps {
  token: any;
  index: number;
}

const TokenCard: FC<TokenCardProps> = memo(({ token, index }) => {
  const volumeHistory = useTokenVolumeStore(state => state.getVolumeHistory(token.address));
  const priceHistory = useTokenPriceStore(state => state.getPriceHistory(token.address));

  const priceChangeColor = token.priceChange24h > 0 ? 'text-green-400' : 'text-red-400';
  const PriceChangeIcon = token.priceChange24h > 0 ? ArrowUpRight : ArrowDownRight;

  // Memoize calculated values
  const { marketCapUSD, initialBuyUSD, volume24hUSD } = useMemo(() => ({
    marketCapUSD: token.marketCapSol * SOL_PRICE_USD,
    initialBuyUSD: (token.solAmount || 0) * SOL_PRICE_USD,
    volume24hUSD: (token.volume24h || 0) * SOL_PRICE_USD
  }), [token.marketCapSol, token.solAmount, token.volume24h]);

  // ... rest of the component code ...

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3, delay: index * 0.1 }}
    >
      <Card className="p-4 bg-black/40 backdrop-blur-lg border border-gray-800 hover:border-blue-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/10">
        {/* ... Card content ... */}
        
        <div className="mt-4 border-t border-gray-800 pt-4">
          <h4 className="text-sm text-gray-400 mb-2">Price & Market Cap</h4>
          <CandlestickChart data={priceHistory} />
        </div>

        {token.address && <TransactionHistory tokenAddress={token.address} />}
      </Card>
    </motion.div>
  );
});

TokenCard.displayName = 'TokenCard';

export default TokenCard;

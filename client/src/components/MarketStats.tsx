import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { usePumpPortalStore } from '@/lib/pump-portal-websocket';
import { BarChart2 } from 'lucide-react';

interface Props {
  tokenAddress: string;
}

interface MarketMetrics {
  marketCap: number;
  price: number;
  priceChange24h: number;
  volume24h: number;
  liquidity: number;
}

const MarketStats: React.FC<Props> = ({ tokenAddress }) => {
  const token = usePumpPortalStore(state => state.getToken(tokenAddress));
  const solPrice = usePumpPortalStore(state => state.solPrice);
  const [metrics, setMetrics] = useState<MarketMetrics>({
    marketCap: 0,
    price: 0,
    priceChange24h: 0,
    volume24h: 0,
    liquidity: 0
  });

  // Update metrics whenever token or solPrice changes
  useEffect(() => {
    if (!token) return;

    // Calculate metrics from real-time data
    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    const recentTrades = token.recentTrades || [];
    const last24hTrades = recentTrades.filter(t => t.timestamp >= oneDayAgo);

    const currentPrice = token.priceInUsd || 0;
    const oldPrice = last24hTrades[last24hTrades.length - 1]?.priceInUsd || currentPrice;
    const priceChange = ((currentPrice - oldPrice) / oldPrice) * 100;

    const volume24h = last24hTrades.reduce((sum, trade) => 
      sum + (trade.tokenAmount * trade.priceInUsd), 0);

    setMetrics({
      marketCap: token.vTokensInBondingCurve * (token.priceInUsd || 0),
      price: token.priceInUsd || 0,
      priceChange24h: priceChange,
      volume24h,
      liquidity: (token.vSolInBondingCurve || 0) * solPrice
    });
  }, [token, solPrice]); // This effect runs every time token or solPrice updates

  if (!token) return null;

  return (
    <Card className="bg-[#0D0B1F] border-purple-900/30">
      <div className="p-4 border-b border-purple-900/30">
        <div className="flex items-center space-x-2">
          <BarChart2 className="w-5 h-5 text-purple-400" />
          <h2 className="text-purple-100 font-semibold">Market Stats</h2>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <div className="flex justify-between">
          <span className="text-sm text-purple-300">Price</span>
          <div className="text-right">
            <span className="text-sm font-medium text-purple-100">
              ${metrics.price.toFixed(8)}
            </span>
            <span className={`ml-2 text-sm ${
              metrics.priceChange24h >= 0 ? 'text-green-400' : 'text-red-400'
            }`}>
              {metrics.priceChange24h > 0 ? '+' : ''}{metrics.priceChange24h.toFixed(2)}%
            </span>
          </div>
        </div>

        <div className="flex justify-between">
          <span className="text-sm text-purple-300">Market Cap</span>
          <span className="text-sm font-medium text-purple-100">
            ${metrics.marketCap.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </span>
        </div>

        <div className="flex justify-between">
          <span className="text-sm text-purple-300">Volume (24h)</span>
          <span className="text-sm font-medium text-purple-100">
            ${metrics.volume24h.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </span>
        </div>

        <div className="flex justify-between">
          <span className="text-sm text-purple-300">Liquidity</span>
          <span className="text-sm font-medium text-purple-100">
            ${metrics.liquidity.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </span>
        </div>
      </div>
    </Card>
  );
};

export default MarketStats;
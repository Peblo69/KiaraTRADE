import { FC } from 'react';
import { usePumpPortalStore } from '@/lib/pump-portal-websocket';
import { Card } from "@/components/ui/card";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string;
  change?: {
    value: number;
    isPositive: boolean;
  };
}

const StatCard: FC<StatCardProps> = ({ title, value, change }) => (
  <div className="flex flex-col gap-1">
    <div className="text-sm text-muted-foreground">{title}</div>
    <div className="font-medium">{value}</div>
    {change && (
      <div className={`text-xs flex items-center gap-1 ${
        change.isPositive ? 'text-green-500' : 'text-red-500'
      }`}>
        {change.isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
        {Math.abs(change.value).toFixed(2)}%
      </div>
    )}
  </div>
);

export const TokenStats: FC<{ tokenAddress: string }> = ({ tokenAddress }) => {
  const token = usePumpPortalStore(state => state.getToken(tokenAddress));
  const trades = token?.recentTrades || [];

  // Calculate 24h stats
  const last24h = trades.filter(t => 
    t.timestamp > Date.now() - 24 * 60 * 60 * 1000
  );

  const stats = {
    price: token?.priceInUsd || 0,
    volume24h: last24h.reduce((sum, t) => sum + ((t.tokenAmount || 0) * (t.priceInUsd || 0)), 0),
    trades24h: last24h.length,
    marketCap: (token?.vTokensInBondingCurve || 0) * (token?.priceInUsd || 0),
    priceChange24h: calculatePriceChange(last24h),
    holders: calculateUniqueHolders(trades)
  };

  return (
    <Card className="p-4">
      <h3 className="text-lg font-semibold mb-4">Token Statistics</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard
          title="Price"
          value={`$${stats.price.toFixed(8)}`}
          change={stats.priceChange24h}
        />
        <StatCard
          title="24h Volume"
          value={`$${stats.volume24h.toLocaleString()}`}
        />
        <StatCard
          title="Market Cap"
          value={`$${stats.marketCap.toLocaleString()}`}
        />
        <StatCard
          title="24h Trades"
          value={stats.trades24h.toString()}
        />
        <StatCard
          title="Holders"
          value={stats.holders.toString()}
        />
      </div>
    </Card>
  );
};

// Helper functions
function calculatePriceChange(trades: any[]): { value: number; isPositive: boolean } {
  if (trades.length < 2) return { value: 0, isPositive: false };

  const current = trades[0]?.priceInUsd || 0;
  const old = trades[trades.length - 1]?.priceInUsd || 0;
  const change = old !== 0 ? ((current - old) / old) * 100 : 0;

  return {
    value: Math.abs(change),
    isPositive: change >= 0
  };
}

function calculateUniqueHolders(trades: any[]): number {
  return new Set(trades.map(t => t.traderPublicKey)).size;
}

export default TokenStats;
import { FC } from "react";
import { usePumpPortalStore } from '@/lib/pump-portal-websocket';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

const TokenMarketStats: FC<{ tokenAddress: string }> = ({ tokenAddress }) => {
  const token = usePumpPortalStore(state => state.getToken(tokenAddress));
  const solPrice = usePumpPortalStore(state => state.solPrice);

  if (!token) return null;

  // Calculate 24h stats from recentTrades
  const last24h = token.recentTrades?.filter(
    trade => trade.timestamp > Date.now() - 24 * 60 * 60 * 1000
  ) || [];

  const volume24h = last24h.reduce((sum, trade) => 
    sum + (trade.tokenAmount * (trade.priceInUsd || 0)), 0);

  const priceChange24h = (() => {
    if (last24h.length < 2) return { value: 0, isPositive: false };
    const current = token.priceInUsd || 0;
    const old = last24h[last24h.length - 1].priceInUsd || 0;
    const change = ((current - old) / old) * 100;
    return { value: Math.abs(change), isPositive: change >= 0 };
  })();

  // Safely calculate market cap and liquidity
  const marketCap = (token.vTokensInBondingCurve || 0) * (token.priceInUsd || 0);
  const liquidityUsd = (token.vSolInBondingCurve || 0) * (solPrice || 0);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-lg border border-purple-500/20 bg-card">
      <StatCard
        title="Price"
        value={`$${token.priceInUsd?.toFixed(8) || '0.00'}`}
        change={priceChange24h}
      />
      <StatCard
        title="24h Volume"
        value={`$${volume24h.toLocaleString(undefined, { maximumFractionDigits: 2 })}`}
      />
      <StatCard
        title="Market Cap"
        value={`$${marketCap.toLocaleString(undefined, { maximumFractionDigits: 2 })}`}
      />
      <StatCard
        title="Liquidity"
        value={`$${liquidityUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}`}
      />
    </div>
  );
};

export default TokenMarketStats;
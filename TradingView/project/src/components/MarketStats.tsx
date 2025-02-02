import React, { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { usePumpPortalStore } from '@/lib/pump-portal-websocket';
import { ArrowUpRight, ArrowDownRight, BarChart2 } from 'lucide-react';

interface Props {
  tokenAddress: string;
}

interface MetricProps {
  label: string;
  value: string;
  subValue?: string;
  change?: number;
}

const MetricDisplay: React.FC<MetricProps> = ({ label, value, subValue, change }) => (
  <div className="flex justify-between items-center">
    <span className="text-sm text-purple-300">{label}</span>
    <div className="text-right">
      <span className={`text-sm font-medium ${
        change ? (change > 0 ? 'text-green-400' : change < 0 ? 'text-red-400' : 'text-purple-100') 
        : 'text-purple-100'
      }`}>
        {value}
        {change && (
          <span className="ml-1">
            {change > 0 ? <ArrowUpRight className="w-3 h-3 inline" /> : <ArrowDownRight className="w-3 h-3 inline" />}
            {Math.abs(change).toFixed(2)}%
          </span>
        )}
      </span>
      {subValue && (
        <div className="text-xs text-purple-400">{subValue}</div>
      )}
    </div>
  </div>
);

const MarketStats: React.FC<Props> = ({ tokenAddress }) => {
  const token = usePumpPortalStore(state => state.getToken(tokenAddress));
  const solPrice = usePumpPortalStore(state => state.solPrice);

  React.useEffect(() => {
    console.log('MarketStats Component:', {
      tokenAddress,
      token,
      solPrice,
      marketCapSol: token?.marketCapSol,
      vTokens: token?.vTokensInBondingCurve,
      vSol: token?.vSolInBondingCurve,
      recentTrades: token?.recentTrades?.length || 0
    });
  }, [token, tokenAddress, solPrice]);

  const metrics = useMemo(() => {
    if (!token) return null;

    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;

    const tokenTrades = token.recentTrades || [];
    const last24hTrades = tokenTrades.filter(t => t.timestamp >= oneDayAgo);

    const currentPrice = token.priceInUsd || 0;
    const oldPrice = last24hTrades[last24hTrades.length - 1]?.priceInUsd || currentPrice;
    const priceChange = oldPrice ? ((currentPrice - oldPrice) / oldPrice) * 100 : 0;

    const volume24h = last24hTrades.reduce((sum, trade) => 
      sum + (trade.tokenAmount || 0) * (trade.priceInUsd || 0), 0);

    // Use the direct marketCapSol value from token state for real-time updates
    const marketCapUsd = token.marketCapSol * solPrice;
    const liquidityUsd = token.vSolInBondingCurve * solPrice;

    return {
      price: {
        usd: currentPrice,
        change: priceChange
      },
      marketCap: {
        usd: marketCapUsd,
        sol: token.marketCapSol
      },
      volume: {
        usd: volume24h,
        sol: volume24h / solPrice
      },
      liquidity: {
        usd: liquidityUsd,
        sol: token.vSolInBondingCurve
      }
    };
  }, [token, solPrice]);

  if (!token || !metrics) return null;

  return (
    <Card className="bg-[#0D0B1F] border-purple-900/30">
      <div className="p-4 border-b border-purple-900/30">
        <div className="flex items-center space-x-2">
          <BarChart2 className="w-5 h-5 text-purple-400" />
          <h2 className="text-purple-100 font-semibold">Market Stats</h2>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <MetricDisplay
          label="Price"
          value={`$${metrics.price.usd.toFixed(8)}`}
          change={metrics.price.change}
        />
        <MetricDisplay
          label="Market Cap"
          value={`$${metrics.marketCap.usd.toLocaleString(undefined, { maximumFractionDigits: 2 })}`}
          subValue={`${metrics.marketCap.sol.toLocaleString()} SOL`}
        />
        <MetricDisplay
          label="24h Volume"
          value={`$${metrics.volume.usd.toLocaleString(undefined, { maximumFractionDigits: 2 })}`}
          subValue={`${metrics.volume.sol.toLocaleString()} SOL`}
        />
        <MetricDisplay
          label="Liquidity"
          value={`$${metrics.liquidity.usd.toLocaleString(undefined, { maximumFractionDigits: 2 })}`}
          subValue={`${metrics.liquidity.sol.toLocaleString()} SOL`}
        />
      </div>
    </Card>
  );
};

export default MarketStats;
import React, { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { usePumpPortalStore } from '@/lib/pump-portal-websocket';
import { useTradingContext } from '@/context/TradingContext';
import { ArrowUpRight, ArrowDownRight, BarChart2, Activity } from 'lucide-react';
import { Progress } from "@/components/ui/progress";

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
  const { trades } = useTradingContext();

  const metrics = useMemo(() => {
    if (!token) return null;

    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;

    // Combine trades from both sources
    const tokenTrades = [...(token.recentTrades || []), ...trades.filter(t => t.mint === tokenAddress)];
    const last24hTrades = tokenTrades.filter(t => t.timestamp >= oneDayAgo);

    const currentPrice = token.priceInUsd || 0;
    const oldPrice = last24hTrades[last24hTrades.length - 1]?.priceInUsd || currentPrice;
    const priceChange = oldPrice ? ((currentPrice - oldPrice) / oldPrice) * 100 : 0;

    const volume24h = last24hTrades.reduce((sum, trade) => 
      sum + (trade.tokenAmount || 0) * (trade.priceInUsd || 0), 0);

    const marketCap = token.vTokensInBondingCurve * (token.priceInUsd || 0);
    const liquidityUsd = (token.vSolInBondingCurve || 0) * solPrice;

    // Volume analysis
    const averageVolume = volume24h / Math.max(1, last24hTrades.length);
    const volumeTrend = last24hTrades.length > 0 ? 
      (last24hTrades[0].tokenAmount || 0) > averageVolume ? 'up' : 'down' : 'up';
    const unusualActivity = Math.abs((volume24h / averageVolume) - 1) > 0.5;

    // Market depth calculations
    const buyPressure = (token.vSolInBondingCurve || 0) / (token.marketCapSol || 1) * 100;
    const sellPressure = 100 - buyPressure;
    const strongestSupport = currentPrice * 0.9; // Simplified support level
    const strongestResistance = currentPrice * 1.1; // Simplified resistance level

    return {
      price: {
        usd: currentPrice,
        change: priceChange
      },
      marketCap: {
        usd: marketCap,
        sol: token.marketCapSol || 0
      },
      volume: {
        usd: volume24h,
        sol: volume24h / solPrice,
        trend: volumeTrend,
        unusual: unusualActivity
      },
      liquidity: {
        usd: liquidityUsd,
        sol: token.vSolInBondingCurve || 0
      },
      depth: {
        buyPressure,
        sellPressure,
        strongestSupport,
        strongestResistance
      }
    };
  }, [token, trades, solPrice, tokenAddress]);

  if (!token || !metrics) return null;

  return (
    <Card className="bg-[#0D0B1F] border-purple-900/30">
      <div className="p-4 border-b border-purple-900/30">
        <div className="flex items-center space-x-2">
          <BarChart2 className="w-5 h-5 text-purple-400" />
          <h2 className="text-purple-100 font-semibold">Market Stats</h2>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Price and Market Cap */}
        <div className="space-y-4">
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
        </div>

        {/* Volume Analysis */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Activity className="w-4 h-4 text-purple-400" />
            <h4 className="text-sm font-medium text-gray-200">Volume Analysis</h4>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <MetricDisplay
              label="24h Volume"
              value={`$${metrics.volume.usd.toLocaleString(undefined, { maximumFractionDigits: 2 })}`}
              subValue={`${metrics.volume.sol.toLocaleString()} SOL`}
            />
            <div className="p-3 rounded-lg bg-gray-900/50">
              <div className="text-sm text-gray-400 mb-1">Activity</div>
              <div className="flex items-center gap-2">
                <Activity className={`w-4 h-4 ${
                  metrics.volume.unusual ? 'text-yellow-400' : 'text-green-400'
                }`} />
                <span className="text-sm text-gray-200">
                  {metrics.volume.unusual ? 'Unusual' : 'Normal'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Market Depth */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <BarChart2 className="w-4 h-4 text-green-400" />
            <h4 className="text-sm font-medium text-gray-200">Market Depth</h4>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-2 rounded bg-gray-900/50">
              <span className="text-sm text-gray-400">Buy Pressure</span>
              <Progress 
                value={metrics.depth.buyPressure} 
                className="w-32 bg-gray-700"
              />
            </div>
            <div className="flex justify-between items-center p-2 rounded bg-gray-900/50">
              <span className="text-sm text-gray-400">Sell Pressure</span>
              <Progress 
                value={metrics.depth.sellPressure} 
                className="w-32 bg-gray-700"
              />
            </div>
            <div className="grid grid-cols-2 gap-4 mt-2">
              <div className="text-center p-2 rounded bg-gray-900/50">
                <div className="text-sm text-gray-400">Support</div>
                <div className="text-sm text-green-400">
                  ${metrics.depth.strongestSupport.toFixed(2)}
                </div>
              </div>
              <div className="text-center p-2 rounded bg-gray-900/50">
                <div className="text-sm text-gray-400">Resistance</div>
                <div className="text-sm text-red-400">
                  ${metrics.depth.strongestResistance.toFixed(2)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default MarketStats;
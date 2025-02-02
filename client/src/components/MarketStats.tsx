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

    // Combine trades from both sources and ensure they're properly formatted
    const tokenTrades = [
      ...(token.recentTrades || []).map(t => ({
        ...t,
        priceInUsd: t.priceInUsd || (t.priceInSol * solPrice),
        timestamp: t.timestamp || Date.now(),
        tokenAmount: t.tokenAmount || 0
      })),
      ...trades.filter(t => t.mint === tokenAddress).map(t => ({
        ...t,
        priceInUsd: t.priceInUsd || (t.priceInSol * solPrice),
        timestamp: t.timestamp || Date.now(),
        tokenAmount: t.tokenAmount || 0
      }))
    ].sort((a, b) => b.timestamp - a.timestamp);

    const last24hTrades = tokenTrades.filter(t => t.timestamp >= oneDayAgo);

    // Calculate current price using the most recent trade or bonding curve
    const currentPrice = token.priceInUsd || (token.priceInSol * solPrice) || 0;
    const oldPrice = last24hTrades.length > 0 ? 
      last24hTrades[last24hTrades.length - 1].priceInUsd : 
      currentPrice;

    const priceChange = oldPrice ? ((currentPrice - oldPrice) / oldPrice) * 100 : 0;

    // Calculate 24h volume ensuring we count actual traded amounts
    const volume24h = last24hTrades.reduce((sum, trade) => {
      const tradeVolume = trade.tokenAmount * trade.priceInUsd;
      return sum + (isNaN(tradeVolume) ? 0 : tradeVolume);
    }, 0);

    // Calculate market cap using the bonding curve data
    const marketCap = (token.vTokensInBondingCurve || 0) * currentPrice;
    const marketCapSol = token.vSolInBondingCurve || 0;

    // Volume analysis with proper calculations
    const volumeInSol = volume24h / solPrice;
    const tradeCount = last24hTrades.length;
    const averageVolume = tradeCount > 0 ? volume24h / tradeCount : 0;
    const recentVolume = last24hTrades[0]?.tokenAmount * last24hTrades[0]?.priceInUsd || 0;
    const volumeTrend = recentVolume > averageVolume ? 'up' : 'down';
    const unusualActivity = Math.abs((recentVolume / averageVolume) - 1) > 0.5;

    // Market depth using bonding curve data
    const totalLiquidity = token.vSolInBondingCurve || 0;
    const buyPressure = totalLiquidity > 0 ? 
      (last24hTrades.filter(t => t.txType === 'buy')
        .reduce((sum, t) => sum + (t.solAmount || 0), 0) / totalLiquidity) * 100 : 0;

    const sellPressure = totalLiquidity > 0 ? 
      (last24hTrades.filter(t => t.txType === 'sell')
        .reduce((sum, t) => sum + (t.solAmount || 0), 0) / totalLiquidity) * 100 : 0;

    // Support and resistance levels based on recent trades
    const sortedPrices = last24hTrades.map(t => t.priceInUsd).sort((a, b) => a - b);
    const strongestSupport = sortedPrices[Math.floor(sortedPrices.length * 0.1)] || currentPrice * 0.9;
    const strongestResistance = sortedPrices[Math.floor(sortedPrices.length * 0.9)] || currentPrice * 1.1;

    return {
      price: {
        usd: currentPrice,
        change: priceChange
      },
      marketCap: {
        usd: marketCap,
        sol: marketCapSol
      },
      volume: {
        usd: volume24h,
        sol: volumeInSol,
        trend: volumeTrend,
        unusual: unusualActivity
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
                  ${metrics.depth.strongestSupport.toFixed(8)}
                </div>
              </div>
              <div className="text-center p-2 rounded bg-gray-900/50">
                <div className="text-sm text-gray-400">Resistance</div>
                <div className="text-sm text-red-400">
                  ${metrics.depth.strongestResistance.toFixed(8)}
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
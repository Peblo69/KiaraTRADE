import React from 'react';
import { Card } from '@/components/ui/card';
import { usePumpPortalStore } from '@/lib/pump-portal-websocket';
import { formatNumber } from '@/lib/utils';

interface Props {
  tokenAddress: string;
}

const MarketStats: React.FC<Props> = ({ tokenAddress }) => {
  const token = usePumpPortalStore(state => state.getToken(tokenAddress));
  const solPrice = usePumpPortalStore(state => state.solPrice);

  if (!token) return null;

  const marketCap = token.vTokensInBondingCurve * (token.priceInUsd || 0);
  const liquidityUsd = (token.vSolInBondingCurve || 0) * solPrice;

  // Calculate 24h stats from recentTrades
  const last24h = token.recentTrades?.filter(
    trade => trade.timestamp > Date.now() - 24 * 60 * 60 * 1000
  ) || [];

  const volume24h = last24h.reduce((sum, trade) => 
    sum + (trade.tokenAmount * (trade.priceInUsd || 0)), 0);

  const priceChange24h = (() => {
    if (last24h.length < 2) return 0;
    const current = token.priceInUsd || 0;
    const old = last24h[last24h.length - 1].priceInUsd || 0;
    return ((current - old) / old) * 100;
  })();

  // Find ATH/ATL from recent trades
  const prices = token.recentTrades?.map(t => t.priceInUsd || 0) || [];
  const ath = Math.max(...prices);
  const atl = Math.min(...prices);

  return (
    <Card className="p-4 bg-[#0D0B1F] border-purple-900/30">
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-purple-100">Market Stats</h2>
        
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-sm text-purple-300">Market Cap</span>
            <span className="text-sm font-medium text-purple-100">
              ${formatNumber(marketCap)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-purple-300">Circulating Supply</span>
            <span className="text-sm font-medium text-purple-100">
              {formatNumber(token.vTokensInBondingCurve)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-purple-300">Total Supply</span>
            <span className="text-sm font-medium text-purple-100">
              {formatNumber(token.vTokensInBondingCurve)}
            </span>
          </div>
        </div>

        <div className="border-t border-purple-900/30 pt-4 space-y-3">
          <div className="flex justify-between">
            <span className="text-sm text-purple-300">Price Change (24h)</span>
            <span className={`text-sm font-medium ${priceChange24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {priceChange24h.toFixed(2)}%
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-purple-300">Volume (24h)</span>
            <span className="text-sm font-medium text-purple-100">
              ${formatNumber(volume24h)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-purple-300">Liquidity</span>
            <span className="text-sm font-medium text-purple-100">
              ${formatNumber(liquidityUsd)}
            </span>
          </div>
        </div>

        <div className="border-t border-purple-900/30 pt-4 space-y-3">
          <div className="flex justify-between">
            <span className="text-sm text-purple-300">ATH</span>
            <div className="text-right">
              <div className="text-sm font-medium text-purple-100">
                ${ath.toFixed(8)}
              </div>
            </div>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-purple-300">ATL</span>
            <div className="text-right">
              <div className="text-sm font-medium text-purple-100">
                ${atl.toFixed(8)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default MarketStats;

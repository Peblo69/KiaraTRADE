
import React from 'react';
import { Card } from '@/components/ui/card';
import { usePumpPortalStore } from '@/lib/pump-portal-websocket';

interface Props {
  tokenAddress: string;
}

const MarketStats: React.FC<Props> = ({ tokenAddress }) => {
  const token = usePumpPortalStore(state => state.getToken(tokenAddress));
  const solPrice = usePumpPortalStore(state => state.solPrice);

  if (!token) return null;

  const marketCap = token.vTokensInBondingCurve * (token.priceInUsd || 0);
  const liquidityUsd = (token.vSolInBondingCurve || 0) * solPrice;

  return (
    <Card className="p-4 bg-[#0D0B1F] border-purple-900/30">
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-purple-100">Market Stats</h2>
        
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-sm text-purple-300">Market Cap</span>
            <span className="text-sm font-medium text-purple-100">
              ${marketCap.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-purple-300">Liquidity</span>
            <span className="text-sm font-medium text-purple-100">
              ${liquidityUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-purple-300">Price</span>
            <span className="text-sm font-medium text-purple-100">
              ${token.priceInUsd?.toFixed(8) || '0.00'}
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default MarketStats;


import React from 'react';
import { Card } from '@/components/ui/card';
import { usePumpPortalStore } from '@/lib/pump-portal-websocket';

interface Props {
  tokenAddress: string;
}

const HolderAnalytics: React.FC<Props> = ({ tokenAddress }) => {
  const token = usePumpPortalStore(state => state.getToken(tokenAddress));

  if (!token) return null;

  return (
    <Card className="p-4 bg-[#0D0B1F] border-purple-900/30">
      <h2 className="text-lg font-semibold text-purple-100 mb-4">Holder Analytics</h2>
      <div className="space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-purple-300">Holders</span>
          <span className="text-purple-100">{token.holdersCount || 0}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-purple-300">Dev %</span>
          <span className="text-purple-100">{(token.devWalletPercentage || 0).toFixed(2)}%</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-purple-300">Top 10 %</span>
          <span className="text-purple-100">{(token.top10HoldersPercentage || 0).toFixed(2)}%</span>
        </div>
      </div>
    </Card>
  );
};

export default HolderAnalytics;

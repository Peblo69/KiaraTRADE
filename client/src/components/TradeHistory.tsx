import React from 'react';
import { Card } from '@/components/ui/card';
import { usePumpPortalStore } from '@/lib/pump-portal-websocket';

interface Props {
  tokenAddress: string;
}

const TradeHistory: React.FC<Props> = ({ tokenAddress }) => {
  const token = usePumpPortalStore(state => state.getToken(tokenAddress));

  if (!token || !token.recentTrades?.length) return null;

  return (
    <Card className="p-4 bg-[#0D0B1F] border-purple-900/30">
      <h2 className="text-lg font-semibold text-purple-100 mb-4">Recent Trades</h2>
      <div className="space-y-2">
        {token.recentTrades.map((trade, index) => (
          <div key={`${trade.signature}-${index}`} className="flex justify-between text-sm">
            <span className={trade.txType === 'buy' ? 'text-green-400' : 'text-red-400'}>
              {trade.txType.toUpperCase()}
            </span>
            <span className="text-purple-300">{trade.solAmount.toFixed(6)} SOL</span>
          </div>
        ))}
      </div>
    </Card>
  );
};

export default TradeHistory;
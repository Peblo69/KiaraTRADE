import React from 'react';
import { Card } from '@/components/ui/card';
import { usePumpPortalStore } from '@/lib/pump-portal-websocket';
import { History } from 'lucide-react';

interface Props {
  tokenAddress: string;
}

const TradeHistory: React.FC<Props> = ({ tokenAddress }) => {
  const token = usePumpPortalStore(state => state.getToken(tokenAddress));

  if (!token || !token.recentTrades?.length) return null;

  return (
    <div className="bg-[#0D0B1F] rounded-lg border border-purple-900/30">
      <div className="p-4 border-b border-purple-900/30">
        <div className="flex items-center space-x-2">
          <History className="w-5 h-5 text-purple-400" />
          <h2 className="text-purple-100 font-semibold">Trade History</h2>
        </div>
      </div>

      <div className="p-2">
        <div className="grid grid-cols-6 text-xs text-purple-400 pb-2">
          <span>Time</span>
          <span>Wallet</span>
          <span className="text-right">Price (USD)</span>
          <span className="text-right">Amount</span>
          <span className="text-right">SOL</span>
          <span className="text-right">Total</span>
        </div>

        <div className="space-y-0.5">
          {token.recentTrades.map((trade, index) => (
            <div key={`${trade.signature}-${index}`} className="grid grid-cols-6 text-xs p-2 hover:bg-purple-900/20 rounded">
              <span className="text-purple-300">
                {new Date(trade.timestamp).toLocaleTimeString()}
              </span>
              <span className={`${trade.txType === 'buy' ? 'text-green-400' : 'text-red-400'}`}>
                {trade.traderPublicKey.slice(0, 6)}...{trade.traderPublicKey.slice(-4)}
              </span>
              <span className="text-right text-purple-300">
                ${trade.priceInUsd?.toFixed(8)}
              </span>
              <span className="text-right text-purple-300">
                {trade.tokenAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </span>
              <span className="text-right text-purple-300">
                {trade.solAmount.toFixed(3)}
              </span>
              <span className="text-right text-purple-300">
                ${(trade.solAmount * (trade.priceInUsd || 0)).toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TradeHistory;
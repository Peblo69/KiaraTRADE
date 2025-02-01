import React from 'react';
import { History, ExternalLink, Copy, CheckCircle } from 'lucide-react';
import { useTradeHistory } from '@/hooks/useTradeHistory';
import { formatDistanceToNow } from 'date-fns';
import { usePumpPortalStore } from '@/lib/pump-portal-websocket';

interface Props {
  tokenAddress: string;
  webSocket: WebSocket | null;
}

const TradeHistory: React.FC<Props> = ({ tokenAddress, webSocket }) => {
  const [copiedAddress, setCopiedAddress] = React.useState<string | null>(null);
  const { trades, isLoading } = useTradeHistory(tokenAddress);
  const solPrice = usePumpPortalStore(state => state.solPrice);

  if (isLoading) {
    return (
      <div className="bg-[#0D0B1F] rounded-lg border border-purple-900/30 p-4 space-y-4">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-purple-900/20 rounded w-1/4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-purple-900/20 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const copyToClipboard = (address: string) => {
    navigator.clipboard.writeText(address);
    setCopiedAddress(address);
    setTimeout(() => setCopiedAddress(null), 2000);
  };

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
          <span className="text-right">Type</span>
          <span className="text-right">Amount</span>
          <span className="text-right">SOL Amount</span>
          <span className="text-right">Total</span>
        </div>

        <div className="space-y-0.5">
          {trades.map((trade) => {
            const total = trade.solAmount * (solPrice || 0);

            return (
              <div key={trade.signature} className="grid grid-cols-6 text-xs group hover:bg-purple-900/20">
                <span className="text-purple-300">
                  {formatDistanceToNow(trade.timestamp, { addSuffix: true })}
                </span>

                <div className="flex items-center space-x-1">
                  <button
                    className={`text-${trade.type === 'buy' ? 'green' : 'red'}-400 hover:underline`}
                  >
                    {trade.traderPublicKey.slice(0, 6)}...{trade.traderPublicKey.slice(-4)}
                  </button>
                  <button
                    className="p-1 hover:bg-purple-900/40 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => copyToClipboard(trade.traderPublicKey)}
                  >
                    {copiedAddress === trade.traderPublicKey ? (
                      <CheckCircle className="w-3 h-3 text-green-400" />
                    ) : (
                      <Copy className="w-3 h-3 text-purple-400" />
                    )}
                  </button>
                  <a
                    href={`https://solscan.io/account/${trade.traderPublicKey}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1 hover:bg-purple-900/40 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <ExternalLink className="w-3 h-3 text-purple-400" />
                  </a>
                </div>

                <span className={`text-right font-medium ${
                  trade.type === 'buy' ? 'text-green-400' : 'text-red-400'
                }`}>
                  {trade.type.toUpperCase()}
                </span>

                <span className="text-right text-purple-300">
                  {trade.tokenAmount.toLocaleString()}
                </span>

                <span className="text-right text-purple-300">
                  {trade.solAmount.toFixed(3)} SOL
                </span>

                <span className="text-right text-purple-300">
                  ${total.toFixed(2)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default TradeHistory;
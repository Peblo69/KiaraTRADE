import React from 'react';
import { History, ExternalLink, Copy } from 'lucide-react';
import { usePumpPortalStore } from '../lib/pump-portal-websocket';

const TradeHistory: React.FC = () => {
  const trades = usePumpPortalStore(state => state.trades);

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatNumber = (num: number, decimals: number = 2) => {
    return num.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
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
          <span className="text-right">Price (USD)</span>
          <span className="text-right">Amount</span>
          <span className="text-right">SOL</span>
          <span className="text-right">Total</span>
        </div>

        <div className="space-y-0.5">
          {trades.map((trade) => (
            <div key={trade.signature} className="grid grid-cols-6 text-xs group hover:bg-purple-900/20">
              <span className="text-purple-300">{formatTime(trade.timestamp)}</span>
              <div className="flex items-center space-x-1">
                <span className={`text-${trade.txType === 'buy' ? 'green' : 'red'}-400`}>
                  {trade.traderPublicKey.slice(0, 6)}...{trade.traderPublicKey.slice(-4)}
                </span>
                <button
                  className="p-1 hover:bg-purple-900/40 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => navigator.clipboard.writeText(trade.traderPublicKey)}
                >
                  <Copy className="w-3 h-3 text-purple-400" />
                </button>
                <a
                  href={`https://solscan.io/tx/${trade.signature}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1 hover:bg-purple-900/40 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <ExternalLink className="w-3 h-3 text-purple-400" />
                </a>
              </div>
              <span className={`text-right font-medium ${
                trade.txType === 'buy' ? 'text-green-400' : 'text-red-400'
              }`}>
                ${formatNumber(trade.priceInUsd || 0, 8)}
              </span>
              <span className="text-right text-purple-300">
                {formatNumber(trade.tokenAmount, 4)}
              </span>
              <span className="text-right text-purple-300">
                {formatNumber(trade.solAmount, 3)} SOL
              </span>
              <span className="text-right text-purple-300">
                ${formatNumber((trade.solAmount * (trade.priceInUsd || 0)), 2)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TradeHistory;
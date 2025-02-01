import React from 'react';
import { History, ExternalLink, Copy, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTokenTrades } from '@/lib/unified-token-store';

interface Props {
  tokenAddress: string;
}

const TradeHistory: React.FC<Props> = ({ tokenAddress }) => {
  const [copiedAddress, setCopiedAddress] = React.useState<string | null>(null);
  const trades = useTokenTrades(tokenAddress);

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const copyToClipboard = React.useCallback((address: string) => {
    navigator.clipboard.writeText(address);
    setCopiedAddress(address);
    setTimeout(() => setCopiedAddress(null), 2000);
  }, []);

  if (!trades?.length) {
    return (
      <div className="bg-[#0D0B1F] rounded-lg border border-purple-900/30 p-4">
        <div className="flex items-center space-x-2 mb-4">
          <History className="w-5 h-5 text-purple-400" />
          <h2 className="text-purple-100 font-semibold">Trade History</h2>
        </div>
        <div className="text-center text-purple-400 py-8">
          No trades yet
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#0D0B1F] rounded-lg border border-purple-900/30">
      <div className="p-4 border-b border-purple-900/30">
        <div className="flex items-center space-x-2">
          <History className="w-5 h-5 text-purple-400" />
          <h2 className="text-purple-100 font-semibold">Trade History</h2>
        </div>
      </div>

      <div className="p-2 max-h-[600px] overflow-y-auto custom-scrollbar">
        <div className="grid grid-cols-6 text-xs text-purple-400 pb-2 sticky top-0 bg-[#0D0B1F] border-b border-purple-900/30">
          <span>Time</span>
          <span>Wallet</span>
          <span className="text-right">Type</span>
          <span className="text-right">Amount</span>
          <span className="text-right">SOL</span>
          <span className="text-right">Total</span>
        </div>

        <AnimatePresence initial={false}>
          {trades.map((trade) => (
            <motion.div
              key={trade.signature}
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="grid grid-cols-6 text-xs py-2 group hover:bg-purple-900/20 border-b border-purple-900/10"
            >
              <span className="text-purple-300">
                {formatTime(trade.timestamp)}
              </span>

              <div className="flex items-center space-x-1">
                <button
                  className={`text-${trade.type === 'buy' ? 'green' : 'red'}-400 hover:underline`}
                >
                  {trade.traderPublicKey.slice(0, 6)}...{trade.traderPublicKey.slice(-4)}
                </button>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                  <button
                    onClick={() => copyToClipboard(trade.traderPublicKey)}
                    className="p-1 hover:bg-purple-900/40 rounded"
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
                    className="p-1 hover:bg-purple-900/40 rounded"
                  >
                    <ExternalLink className="w-3 h-3 text-purple-400" />
                  </a>
                </div>
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
                ${trade.priceInUsd.toFixed(2)}
              </span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default React.memo(TradeHistory);
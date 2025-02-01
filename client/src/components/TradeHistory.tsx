
import { FC } from "react";
import { usePumpPortalStore } from "@/lib/pump-portal-websocket";
import { History, ExternalLink, Copy } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  tokenAddress: string;
}

const TradeHistory: FC<Props> = ({ tokenAddress }) => {
  const token = usePumpPortalStore(state => state.getToken(tokenAddress));

  if (!token?.recentTrades?.length) return null;

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <History className="w-5 h-5 text-purple-400" />
          <h2 className="text-lg font-semibold text-purple-100">Trade History</h2>
        </div>
      </div>

      <div className="custom-scrollbar h-[calc(100vh-220px)] overflow-y-auto">
        <div className="grid grid-cols-6 text-xs text-purple-400 pb-2 sticky top-0 bg-[#0D0B1F] p-2">
          <span>Time</span>
          <span>Wallet</span>
          <span className="text-right">Price</span>
          <span className="text-right">Amount</span>
          <span className="text-right">SOL</span>
          <span className="text-right">Total</span>
        </div>

        <AnimatePresence>
          {token.recentTrades.map((trade, index) => (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              key={`${trade.signature}-${index}`}
              className={`grid grid-cols-6 text-xs p-2 hover:bg-purple-900/20 rounded group ${
                index === 0 ? 'highlight' : ''
              }`}
            >
              <span className="text-purple-300">
                {formatTime(trade.timestamp)}
              </span>
              <div className="flex items-center space-x-1">
                <span className={trade.txType === 'buy' ? 'text-green-400' : 'text-red-400'}>
                  {trade.traderPublicKey.slice(0, 6)}...{trade.traderPublicKey.slice(-4)}
                </span>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                  <button
                    onClick={() => navigator.clipboard.writeText(trade.traderPublicKey)}
                    className="p-1 hover:bg-purple-900/40 rounded"
                  >
                    <Copy className="w-3 h-3 text-purple-400" />
                  </button>
                  <a
                    href={`https://solscan.io/tx/${trade.signature}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1 hover:bg-purple-900/40 rounded"
                  >
                    <ExternalLink className="w-3 h-3 text-purple-400" />
                  </a>
                </div>
              </div>
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
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default TradeHistory;

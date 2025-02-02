import React from 'react';
import { History, ExternalLink, Copy } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePumpPortalStore } from '@/lib/pump-portal-websocket';

interface Props {
  tokenAddress: string;
}

// Whale detection function
const isWhale = (solAmount: number) => {
  const WHALE_THRESHOLD = 15; // 15 SOL threshold for whale trades
  return solAmount >= WHALE_THRESHOLD;
};

// Bot detection functions
const checkTradeSpeed = (trades: any[], currentTrade: any) => {
  // Get only trades from the same wallet we're checking
  const walletTrades = trades
    .filter(t => t.traderPublicKey === currentTrade.traderPublicKey)
    .sort((a, b) => b.timestamp - a.timestamp);

  if (walletTrades.length < 2) return null;

  // Get time between trades in milliseconds
  return Math.abs(walletTrades[0].timestamp - walletTrades[1].timestamp);
};

const isSuspiciouslyFast = (speed: number | null) => {
  if (speed === null) return false;
  const BOT_SPEED_THRESHOLD = 500; // 0.5 seconds
  return speed < BOT_SPEED_THRESHOLD;
};

const TradeHistory: React.FC<Props> = ({ tokenAddress }) => {
  const [copiedAddress, setCopiedAddress] = React.useState<string | null>(null);
  const [displayCount, setDisplayCount] = React.useState(50);
  const token = usePumpPortalStore(state => state.getToken(tokenAddress));
  const trades = token?.recentTrades || [];
  const solPrice = usePumpPortalStore(state => state.solPrice);

  const loadMore = () => {
    setDisplayCount(prev => prev + 50);
  };

  // Debug: Log store state and trades
  React.useEffect(() => {
    console.log('🎯 TradeHistory Component:', {
      tokenAddress,
      hasToken: !!token,
      tradesCount: trades.length,
      trades: trades,
      solPrice
    });
  }, [tokenAddress, token, trades, solPrice]);

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  if (!trades.length) {
    return (
      <div className="p-4 text-center text-purple-400">
        <History className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p>No trades yet</p>
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
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <History className="w-5 h-5 text-purple-400" />
            <h2 className="text-purple-100 font-semibold">Trade History</h2>
          </div>
          <div className="text-xs text-purple-400">
            {trades.length} trades
          </div>
        </div>
      </div>

      <div className="p-2 h-[600px] overflow-y-auto scrollbar-hide" onScroll={(e) => {
        const bottom = e.currentTarget.scrollHeight - e.currentTarget.scrollTop === e.currentTarget.clientHeight;
        if (bottom && trades.length > displayCount) {
          loadMore();
        }
      }}>
        <div className="grid grid-cols-6 text-xs text-purple-400 pb-2 sticky top-0 bg-[#0D0B1F] border-b border-purple-900/30">
          <span>Time</span>
          <span>Wallet</span>
          <span className="text-right">Type</span>
          <span className="text-right">Amount</span>
          <span className="text-right">SOL</span>
          <span className="text-right">Total</span>
        </div>

        <AnimatePresence initial={false}>
          {trades.slice(0, displayCount).map((trade, index) => {
            const total = trade.solAmount * solPrice;
            const isNew = index === 0;

            return (
              <motion.div
                key={trade.signature}
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className={`grid grid-cols-6 text-xs py-2 group hover:bg-purple-900/20 border-b border-purple-900/10 ${
                  isNew ? 'bg-purple-500/10' : ''
                }`}
              >
                <span className="text-purple-300">
                  {formatTime(trade.timestamp)}
                </span>

                <div className="flex items-center space-x-1">
                  <div className="flex items-center">
                    <button
                      className={`text-${trade.txType === 'buy' ? 'green' : 'red'}-400 hover:underline`}
                    >
                      {trade.traderPublicKey.slice(0, 6)}...{trade.traderPublicKey.slice(-4)}
                    </button>
                    {isSuspiciouslyFast(checkTradeSpeed(trades, trade)) && (
                      <span 
                        className="ml-1" 
                        title="Bot-like trading pattern detected"
                      >
                        🤖
                      </span>
                    )}
                    {isWhale(trade.solAmount) && (
                      <span className="ml-1" title={`Whale Trade: ${trade.solAmount} SOL`}>🐋</span>
                    )}
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                    <button
                      onClick={() => copyToClipboard(trade.traderPublicKey)}
                      className="p-1 hover:bg-purple-900/40 rounded"
                    >
                      <Copy className="w-3 h-3 text-purple-400" />
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
                  trade.txType === 'buy' ? 'text-green-400' : 'text-red-400'
                }`}>
                  {trade.txType.toUpperCase()}
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
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default TradeHistory;

import React, { useState, useEffect } from 'react';
import { History, ExternalLink, Copy, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePumpPortalStore } from '@/lib/pump-portal-websocket';

// Whale detection function
const isWhale = (solAmount: number) => {
  const WHALE_THRESHOLD = 15; // 15 SOL threshold for whale trades
  return solAmount >= WHALE_THRESHOLD;
};

// Bot detection functions
const checkTradeSpeed = (trades: any[], currentTrade: any) => {
  const walletTrades = trades
    .filter(t => t.traderPublicKey === currentTrade.traderPublicKey)
    .sort((a, b) => b.timestamp - a.timestamp);
  if (walletTrades.length < 2) return null;
  return Math.abs(walletTrades[0].timestamp - walletTrades[1].timestamp);
};

const isSuspiciouslyFast = (speed: number | null) => {
  if (speed === null) return false;
  const BOT_SPEED_THRESHOLD = 500; // 0.5 seconds
  return speed < BOT_SPEED_THRESHOLD;
};

interface Props {
  tokenAddress?: string;
}

const TradeHistory: React.FC<Props> = ({ tokenAddress = 'default-token' }) => {
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);
  const [displayCount, setDisplayCount] = useState(50);

  const token = usePumpPortalStore(state => state.getToken(tokenAddress));
  // Use real trades from the store; if none, default to an empty array.
  const trades = token?.recentTrades || [];
  const solPrice = usePumpPortalStore(state => state.solPrice);

  // For infinite scrolling
  const loadMore = () => {
    setDisplayCount(prev => prev + 50);
  };

  useEffect(() => {
    console.log('🎯 TradeHistory Component:', {
      tokenAddress,
      hasToken: !!token,
      tradesCount: trades.length,
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

  const formatNumber = (num: number, decimals: number = 2) => {
    return num.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  };

  const copyToClipboard = (address: string) => {
    navigator.clipboard.writeText(address);
    setCopiedAddress(address);
    setTimeout(() => setCopiedAddress(null), 2000);
  };

  if (!trades.length) {
    return (
      <div className="p-4 text-center text-purple-400">
        <History className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p>No trades yet</p>
      </div>
    );
  }

  return (
    <div className="bg-[#0D0B1F] rounded-lg border border-purple-900/30">
      {/* Header */}
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

      {/* Trade History List */}
      <div 
        className="p-2 h-[600px] overflow-y-auto scrollbar-hide" 
        onScroll={(e) => {
          const bottom = e.currentTarget.scrollHeight - e.currentTarget.scrollTop === e.currentTarget.clientHeight;
          if (bottom && trades.length > displayCount) {
            loadMore();
          }
        }}
      >
        {/* Sticky Header Row */}
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
            // Calculate total in USD based on solAmount and current solPrice.
            const totalUSD = trade.solAmount * solPrice;
            const tradeSpeed = checkTradeSpeed(trades, trade);
            const newTrade = index === 0; // mark newest trade
            return (
              <motion.div
                key={trade.signature}
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className={`grid grid-cols-6 text-xs py-2 group hover:bg-purple-900/20 border-b border-purple-900/10 ${
                  newTrade ? 'bg-purple-500/10' : ''
                }`}
              >
                {/* Time */}
                <span className="text-purple-300">{formatTime(trade.timestamp)}</span>

                {/* Wallet with copy and external link */}
                <div className="flex items-center space-x-1">
                  <button
                    className={`text-${trade.txType === 'buy' ? 'green' : 'red'}-400 hover:underline`}
                  >
                    {trade.traderPublicKey.slice(0, 6)}...{trade.traderPublicKey.slice(-4)}
                  </button>
                  {isSuspiciouslyFast(tradeSpeed) && (
                    <span className="ml-1" title="Bot-like trading pattern detected">🤖</span>
                  )}
                  {isWhale(trade.solAmount) && (
                    <span className="ml-1" title={`Whale Trade: ${trade.solAmount} SOL`}>🐋</span>
                  )}
                  <button
                    onClick={() => copyToClipboard(trade.traderPublicKey)}
                    className="p-1 hover:bg-purple-900/40 rounded transition-opacity opacity-0 group-hover:opacity-100"
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
                    className="p-1 hover:bg-purple-900/40 rounded transition-opacity opacity-0 group-hover:opacity-100"
                  >
                    <ExternalLink className="w-3 h-3 text-purple-400" />
                  </a>
                </div>

                {/* Trade Type */}
                <span className={`text-right font-medium ${trade.txType === 'buy' ? 'text-green-400' : 'text-red-400'}`}>
                  {trade.txType.toUpperCase()}
                </span>

                {/* Amount */}
                <span className="text-right text-purple-300">
                  {formatNumber(trade.tokenAmount, 4)}
                </span>

                {/* SOL Amount */}
                <span className="text-right text-purple-300">
                  {formatNumber(trade.solAmount, 3)} SOL
                </span>

                {/* Total USD */}
                <span className="text-right text-purple-300">
                  ${formatNumber(totalUSD, 2)}
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

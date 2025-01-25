
import { FC } from 'react';
import { useUnifiedTokenStore } from '@/lib/unified-token-store';
import { usePumpPortalStore } from '@/lib/pump-portal-websocket';
import { ExternalLink } from 'lucide-react';

interface TransactionHistoryProps {
  tokenAddress: string;
}

const formatAddress = (address: string): string => {
  if (!address) return '';
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
};

const formatTimeAgo = (timestamp: number): string => {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
};

const TransactionHistory: FC<TransactionHistoryProps> = ({ tokenAddress }) => {
  const transactions = useUnifiedTokenStore(state => state.getTransactions(tokenAddress));
  const solPrice = usePumpPortalStore(state => state.solPrice);

  if (!transactions?.length) {
    return null;
  }

  return (
    <div className="mt-4 border-t border-gray-800 pt-4">
      <h4 className="text-sm text-gray-400 mb-3">Recent Transactions</h4>
      <div className="space-y-2">
        {transactions.map((tx) => {
          const timeAgo = formatTimeAgo(tx.timestamp);
          const buyerAddress = formatAddress(tx.buyer);
          const sellerAddress = formatAddress(tx.seller);
          const usdAmount = tx.solAmount * (solPrice || 0);
          const date = new Date(tx.timestamp);
          const timeString = date.toLocaleTimeString();

          return (
            <div key={tx.signature} className="flex flex-col p-3 bg-gray-900/50 rounded-lg text-sm">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded ${tx.type === 'buy' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                    {tx.type === 'buy' ? 'Buy' : 'Sell'}
                  </span>
                  <span className="text-gray-400 text-xs">{timeString}</span>
                  <span className="text-gray-500 text-xs">({timeAgo})</span>
                </div>
                <a
                  href={`https://solscan.io/tx/${tx.signature}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-blue-400 transition-colors"
                >
                  <ExternalLink size={14} />
                </a>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-1">
                    <span className="text-gray-400 text-xs">From:</span>
                    <a
                      href={`https://solscan.io/account/${tx.seller}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-300 hover:text-blue-400 transition-colors"
                    >
                      {sellerAddress}
                    </a>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-gray-400 text-xs">To:</span>
                    <a
                      href={`https://solscan.io/account/${tx.buyer}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-300 hover:text-blue-400 transition-colors"
                    >
                      {buyerAddress}
                    </a>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-white">{tx.solAmount.toFixed(4)} SOL</span>
                  <span className="text-gray-400 text-xs">${usdAmount.toFixed(6)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TransactionHistory;

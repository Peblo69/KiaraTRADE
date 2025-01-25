import { FC } from 'react';
import { useUnifiedTokenStore } from '@/lib/unified-token-store';
import { ExternalLink } from 'lucide-react';

interface TransactionHistoryProps {
  tokenAddress: string;
}

const formatAddress = (address: string): string => {
  if (!address) return '';
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
};

const formatTime = (timestamp: number): string => {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
};

const TransactionHistory: FC<TransactionHistoryProps> = ({ tokenAddress }) => {
  const transactions = useUnifiedTokenStore(state => state.getTransactions(tokenAddress));

  if (!transactions?.length) {
    return null;
  }

  return (
    <div className="mt-4 border-t border-gray-800 pt-4">
      <h4 className="text-sm text-gray-400 mb-3">Recent Transactions</h4>
      <div className="space-y-2">
        {transactions.map((tx) => {
          const timeAgo = formatTime(tx.timestamp);
          const buyerAddress = formatAddress(tx.buyer);

          return (
            <div 
              key={tx.signature} 
              className="flex items-center justify-between p-2 bg-gray-900/50 rounded-lg text-sm"
            >
              <div className="flex items-center gap-2">
                <span className={`text-xs font-medium ${tx.type === 'buy' ? 'text-green-400' : 'text-blue-400'}`}>
                  {tx.type === 'buy' ? 'Buy' : 'Sell'}
                </span>
                <a
                  href={`https://solscan.io/account/${tx.buyer}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-blue-400 transition-colors"
                >
                  {buyerAddress}
                </a>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-white">{tx.solAmount.toFixed(3)} SOL</span>
                <span className="text-gray-500 text-xs">{timeAgo}</span>
                <a
                  href={`https://solscan.io/tx/${tx.signature}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-blue-400 transition-colors"
                >
                  <ExternalLink size={14} />
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TransactionHistory;
import React, { useState } from 'react';
import { History, ExternalLink, Copy, CheckCircle } from 'lucide-react';
import type { Trade } from '../types/trading';

const TradeHistory: React.FC = () => {
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);

  const mockTrades: Trade[] = [
    { 
      id: '1', 
      price: 46789.50, 
      amount: 1.2345,
      amountUSD: 10972.14,
      amountSOL: 146.23,
      side: 'buy', 
      timestamp: Date.now() - 5000, 
      wallet: '0x1234...5678',
      maker: true,
      fee: 1.1
    },
    { 
      id: '2', 
      price: 46788.00, 
      amount: 1.1678,
      amountUSD: 7851.03,
      amountSOL: 104.87,
      side: 'sell', 
      timestamp: Date.now() - 10000, 
      wallet: '0x8765...4321',
      maker: false,
      fee: 1.1
    }
  ];

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
          <span className="text-right">SOL Amount</span>
          <span className="text-right">Total</span>
        </div>

        <div className="space-y-0.5">
          {mockTrades.map((trade) => (
            <div key={trade.id} className="grid grid-cols-6 text-xs group hover:bg-purple-900/20">
              <span className="text-purple-300">{formatTime(trade.timestamp)}</span>
              <div className="flex items-center space-x-1">
                <button
                  className={`text-${trade.side === 'buy' ? 'green' : 'red'}-400 hover:underline`}
                >
                  {trade.wallet}
                </button>
                <button
                  className="p-1 hover:bg-purple-900/40 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => copyToClipboard(trade.wallet)}
                >
                  {copiedAddress === trade.wallet ? (
                    <CheckCircle className="w-3 h-3 text-green-400" />
                  ) : (
                    <Copy className="w-3 h-3 text-purple-400" />
                  )}
                </button>
                <a
                  href={`https://explorer.solana.com/address/${trade.wallet}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1 hover:bg-purple-900/40 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <ExternalLink className="w-3 h-3 text-purple-400" />
                </a>
              </div>
              <span className={`text-right font-medium ${
                trade.side === 'buy' ? 'text-green-400' : 'text-red-400'
              }`}>
                ${formatNumber(trade.price, 2)}
              </span>
              <span className="text-right text-purple-300">
                {formatNumber(trade.amount, 4)}
              </span>
              <span className="text-right text-purple-300">
                {formatNumber(trade.amountSOL, 2)} SOL
              </span>
              <span className="text-right text-purple-300">
                ${formatNumber(trade.amountUSD, 2)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TradeHistory;
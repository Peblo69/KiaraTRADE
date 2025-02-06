import React from 'react';
import { Copy, Download, Key, Trash2 } from 'lucide-react';

interface Transaction {
  id: string;
  type: string;
  amount: string;
  timestamp: number;
  from: string;
  to: string;
}

interface Wallet {
  id: string;
  name: string;
  address: string;
  balance: string;
  balanceUSD: string;
  isPrimary: boolean;
  chain: string;
  recentTransactions: Transaction[];
}

interface WalletSectionProps {
  wallets: Wallet[];
}

export function WalletSection({ wallets }: WalletSectionProps) {
  const totalBalance = wallets.reduce((sum, wallet) => 
    sum + parseFloat(wallet.balanceUSD.replace(',', '')), 0
  ).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const handleCopyAddress = (address: string) => {
    navigator.clipboard.writeText(address);
  };

  return (
    <div className="glass-card rounded-xl p-6 bg-kiara-dark/80 border border-purple-500/20">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">
            Wallet Overview
          </h2>
          <p className="text-purple-300 mt-1">
            Total Balance: ${totalBalance}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            className="cyber-button flex items-center gap-2"
          >
            <Key size={18} />
            Import Wallet
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
        {wallets.map((wallet) => (
          <div
            key={wallet.id}
            className={`p-4 rounded-lg border transition-all ${
              wallet.isPrimary 
                ? 'border-purple-500/50 bg-purple-900/20' 
                : 'border-purple-500/20 bg-purple-900/10 hover:bg-purple-900/20'
            }`}
          >
            <div className="flex justify-between">
              <div>
                <h3 className="text-lg font-medium text-purple-100">{wallet.name}</h3>
                <p className="text-purple-400/70 text-sm">{wallet.address}</p>
              </div>
              <div className="flex flex-col items-end">
                <p className="text-lg font-medium text-purple-100">${wallet.balanceUSD}</p>
                <p className="text-purple-400/70 text-sm">{wallet.chain}</p>
              </div>
            </div>
            {wallet.recentTransactions.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-medium text-purple-400">Recent Transactions</h4>
                <ul className="list-disc text-purple-400/70 text-xs">
                  {wallet.recentTransactions.map((tx) => (
                    <li key={tx.id}>{tx.type} {tx.amount} {tx.from} {'->'} {tx.to}</li>
                  ))}
                </ul>
              </div>
            )}
            <div className='flex gap-2 mt-2'>
              <button 
                className='text-purple-400 hover:text-purple-300'
                onClick={() => handleCopyAddress(wallet.address)}
              >
                <Copy size={16} />
              </button>
              <button className='text-purple-400 hover:text-purple-300'>
                <Download size={16}/>
              </button>
              <button className='text-purple-400 hover:text-purple-300'>
                <Trash2 size={16}/>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
import React from 'react';
import { ArrowUpRight, ArrowDownRight, Plus, Download, Upload, History } from 'lucide-react';

export function WalletDashboard() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-fade-in">
      {/* Portfolio Overview Section */}
      <div className="relative group">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl blur opacity-25 group-hover:opacity-40 transition duration-1000"></div>
        <div className="relative neon-border bg-kiara-dark/80 rounded-xl p-6">
          <h2 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400 mb-6">
            Portfolio Overview
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-4 hover:bg-purple-900/30 transition-all duration-300">
              <div className="text-purple-300 text-sm">Total Balance</div>
              <div className="text-purple-100 text-xl font-semibold mt-1">$45,678.90</div>
              <div className="flex items-center text-green-400 text-sm mt-1">
                <ArrowUpRight size={16} className="animate-bounce" />
                2.4% (24h)
              </div>
            </div>

            <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-4 hover:bg-purple-900/30 transition-all duration-300">
              <div className="text-purple-300 text-sm">SOL Balance</div>
              <div className="text-purple-100 text-xl font-semibold mt-1">245.32 SOL</div>
              <div className="text-purple-400 text-sm mt-1">≈ $12,345.67</div>
            </div>

            <div className="md:col-span-2 lg:col-span-1 bg-purple-900/20 border border-purple-500/30 rounded-lg p-4 hover:bg-purple-900/30 transition-all duration-300">
              <div className="text-purple-300 text-sm">Quick Actions</div>
              <div className="flex gap-2 mt-2">
                <button className="flex-1 bg-purple-600 text-white px-3 py-2 rounded-lg hover:bg-purple-500 transition-all duration-300 hover:scale-105 transform flex items-center justify-center gap-1">
                  <Download size={14} />
                  Deposit
                </button>
                <button className="flex-1 bg-purple-900/30 text-purple-300 px-3 py-2 rounded-lg border border-purple-500/30 hover:bg-purple-900/40 transition-all duration-300 hover:scale-105 transform flex items-center justify-center gap-1">
                  <Upload size={14} />
                  Withdraw
                </button>
              </div>
            </div>
          </div>

          {/* Token List Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-purple-300 text-sm">
                  <th className="text-left py-3 px-4">Token</th>
                  <th className="text-right py-3 px-4">Balance</th>
                  <th className="text-right py-3 px-4">USD Value</th>
                  <th className="text-right py-3 px-4">24h Change</th>
                  <th className="text-right py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-purple-900/30">
                {[
                  { name: 'Solana', symbol: 'SOL', balance: '245.32', value: '12,345.67', change: 2.4 },
                  { name: 'USD Coin', symbol: 'USDC', balance: '10,234.56', value: '10,234.56', change: 0 },
                  { name: 'Raydium', symbol: 'RAY', balance: '1,234.56', value: '2,345.67', change: -1.2 },
                ].map((token, i) => (
                  <tr key={i} className="group hover:bg-purple-900/20 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-400 to-blue-400"></div>
                        <div>
                          <div className="text-purple-100">{token.name}</div>
                          <div className="text-purple-400 text-sm">{token.symbol}</div>
                        </div>
                      </div>
                    </td>
                    <td className="text-right py-3 px-4 text-purple-100">{token.balance}</td>
                    <td className="text-right py-3 px-4 text-purple-100">${token.value}</td>
                    <td className="text-right py-3 px-4">
                      <span className={`flex items-center justify-end gap-1 ${token.change > 0 ? 'text-green-400' : token.change < 0 ? 'text-red-400' : 'text-purple-400'}`}>
                        {token.change > 0 ? <ArrowUpRight size={14} /> : token.change < 0 ? <ArrowDownRight size={14} /> : null}
                        {token.change > 0 ? '+' : ''}{token.change}%
                      </span>
                    </td>
                    <td className="text-right py-3 px-4">
                      <div className="flex items-center justify-end gap-2">
                        <button className="p-2 rounded-lg bg-purple-900/20 text-purple-400 hover:bg-purple-900/30 transition-colors">
                          <Download size={14} />
                        </button>
                        <button className="p-2 rounded-lg bg-purple-900/20 text-purple-400 hover:bg-purple-900/30 transition-colors">
                          <Upload size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Transaction History */}
      <div className="relative group">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl blur opacity-25 group-hover:opacity-40 transition duration-1000"></div>
        <div className="relative neon-border bg-kiara-dark/80 rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">
              Transaction History
            </h2>
            <button className="p-2 rounded-lg bg-purple-900/20 text-purple-400 hover:bg-purple-900/30 transition-colors">
              <History size={20} />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-purple-300 text-sm">
                  <th className="text-left py-3 px-4">Date</th>
                  <th className="text-left py-3 px-4">Type</th>
                  <th className="text-right py-3 px-4">Amount</th>
                  <th className="text-right py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-purple-900/30">
                {[
                  { date: '2025-02-06 14:30', type: 'Deposit', amount: '+12.5 SOL', status: 'Completed' },
                  { date: '2025-02-06 13:15', type: 'Withdraw', amount: '-5.0 SOL', status: 'Pending' },
                  { date: '2025-02-06 12:00', type: 'Deposit', amount: '+100 USDC', status: 'Completed' },
                ].map((tx, i) => (
                  <tr key={i} className="group hover:bg-purple-900/20 transition-colors">
                    <td className="py-3 px-4 text-purple-100">{tx.date}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1 ${tx.type === 'Deposit' ? 'text-green-400' : 'text-purple-400'}`}>
                        {tx.type === 'Deposit' ? <Download size={14} /> : <Upload size={14} />}
                        {tx.type}
                      </span>
                    </td>
                    <td className="text-right py-3 px-4 text-purple-100">{tx.amount}</td>
                    <td className="text-right py-3 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        tx.status === 'Completed' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {tx.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

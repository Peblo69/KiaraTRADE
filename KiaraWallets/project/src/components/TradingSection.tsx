import React from 'react';
import { TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';

const mockTokens = [
  { name: 'PumpFun', symbol: 'PUMP', price: '2.45', change: '+5.2%', position: 'long' },
  { name: 'SolFun', symbol: 'SFUN', price: '1.23', change: '-2.1%', position: 'short' },
];

export function TradingSection() {
  return (
    <div className="neon-border bg-kiara-dark/80 rounded-xl p-6">
      <h2 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400 mb-6">
        Active Trading
      </h2>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-purple-500/20">
              <th className="text-left py-3 px-4 text-purple-300">Token</th>
              <th className="text-right py-3 px-4 text-purple-300">Price</th>
              <th className="text-right py-3 px-4 text-purple-300">24h Change</th>
              <th className="text-right py-3 px-4 text-purple-300">Position</th>
              <th className="text-right py-3 px-4 text-purple-300">Actions</th>
            </tr>
          </thead>
          <tbody>
            {mockTokens.map((token) => (
              <tr key={token.symbol} className="border-b border-purple-500/10">
                <td className="py-4 px-4">
                  <div>
                    <div className="font-semibold text-purple-100">{token.name}</div>
                    <div className="text-sm text-purple-400">{token.symbol}</div>
                  </div>
                </td>
                <td className="text-right py-4 px-4 font-mono text-purple-100">
                  ${token.price}
                </td>
                <td className={`text-right py-4 px-4 ${token.change.startsWith('+') ? 'text-green-400' : 'text-red-400'}`}>
                  {token.change}
                </td>
                <td className="text-right py-4 px-4">
                  {token.position === 'long' ? (
                    <span className="inline-flex items-center gap-1 text-green-400">
                      <TrendingUp size={16} /> Long
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-red-400">
                      <TrendingDown size={16} /> Short
                    </span>
                  )}
                </td>
                <td className="text-right py-4 px-4">
                  <button className="text-purple-400 hover:text-purple-300 mr-2">
                    <AlertCircle size={16} />
                  </button>
                  <button className="cyber-button">
                    Trade
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
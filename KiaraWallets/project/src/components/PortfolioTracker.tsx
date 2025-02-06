import React, { useState } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  BarChart2, 
  DollarSign, 
  Clock, 
  Activity,
  Info,
  X,
  ExternalLink,
  ChevronRight,
  Zap
} from 'lucide-react';

interface TokenData {
  id: string;
  symbol: string;
  name: string;
  logo: string;
  price: number;
  priceChange24h: number;
  holdings: number;
  marketCap: number;
  volume24h: number;
  purchaseHistory: PurchaseEntry[];
}

interface PurchaseEntry {
  id: string;
  date: number;
  amount: number;
  price: number;
}

export function PortfolioTracker() {
  const [tokens, setTokens] = useState<TokenData[]>([
    {
      id: "sol",
      symbol: "SOL",
      name: "Solana",
      logo: "https://images.unsplash.com/photo-1677519910517-5a37a7451a9f?auto=format&fit=crop&w=40&h=40",
      price: 125.45,
      priceChange24h: 5.2,
      holdings: 12.5,
      marketCap: 54321000000,
      volume24h: 1234567890,
      purchaseHistory: [
        { id: "p1", date: Date.now() - 86400000, amount: 5.5, price: 120.30 },
        { id: "p2", date: Date.now() - 172800000, amount: 7, price: 118.45 }
      ]
    },
    {
      id: "orca",
      symbol: "ORCA",
      name: "Orca",
      logo: "https://images.unsplash.com/photo-1676621982451-3e268da5bd4f?auto=format&fit=crop&w=40&h=40",
      price: 1.23,
      priceChange24h: -2.1,
      holdings: 1000,
      marketCap: 123456789,
      volume24h: 9876543,
      purchaseHistory: [
        { id: "p3", date: Date.now() - 259200000, amount: 1000, price: 1.15 }
      ]
    }
  ]);

  const [selectedToken, setSelectedToken] = useState<string | null>(null);

  const calculatePNL = (token: TokenData) => {
    const totalInvestment = token.purchaseHistory.reduce(
      (sum, entry) => sum + (entry.amount * entry.price), 0
    );
    const currentValue = token.holdings * token.price;
    return currentValue - totalInvestment;
  };

  const formatUSD = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-US').format(value);
  };

  return (
    <div className="space-y-6">
      {/* Portfolio Overview */}
      <div className="neon-border bg-kiara-dark/80 rounded-xl p-6">
        <h2 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400 mb-6">
          Token Portfolio
        </h2>

        <div className="space-y-4">
          {tokens.map(token => {
            const pnl = calculatePNL(token);
            const currentValue = token.holdings * token.price;

            return (
              <div key={token.id} className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <img
                      src={token.logo}
                      alt={token.name}
                      className="w-10 h-10 rounded-full neon-glow"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-purple-100">{token.symbol}</span>
                        <span className="text-sm text-purple-300">{token.name}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-lg font-semibold text-purple-100">
                          {formatUSD(token.price)}
                        </span>
                        <span className={`flex items-center text-sm ${
                          token.priceChange24h >= 0 ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {token.priceChange24h >= 0 ? (
                            <TrendingUp size={16} className="mr-1" />
                          ) : (
                            <TrendingDown size={16} className="mr-1" />
                          )}
                          {Math.abs(token.priceChange24h)}%
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-lg font-semibold text-purple-100">
                      {token.holdings.toFixed(4)} {token.symbol}
                    </div>
                    <div className="flex items-center gap-2 justify-end mt-1">
                      <span className="text-purple-300">{formatUSD(currentValue)}</span>
                      <span className={`flex items-center text-sm ${
                        pnl >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        ({pnl >= 0 ? '+' : ''}{formatUSD(pnl)})
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 mt-4">
                  <button className="cyber-button flex-1 flex items-center justify-center gap-2">
                    <Zap size={16} className="text-yellow-400" />
                    Buy
                  </button>
                  <button className="cyber-button flex-1 flex items-center justify-center gap-2">
                    <Zap size={16} className="text-yellow-400" />
                    Sell
                  </button>
                  <button 
                    onClick={() => setSelectedToken(token.id)}
                    className="cyber-button flex items-center gap-1"
                  >
                    Details
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Token Details Modal */}
      {selectedToken && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-kiara-dark/95 border border-purple-500/30 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {tokens.filter(t => t.id === selectedToken).map(token => (
              <div key={token.id} className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <img
                      src={token.logo}
                      alt={token.name}
                      className="w-12 h-12 rounded-full neon-glow"
                    />
                    <div>
                      <h3 className="text-xl font-bold text-purple-100">{token.name}</h3>
                      <span className="text-purple-300">{token.symbol}</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => setSelectedToken(null)}
                    className="text-purple-400 hover:text-purple-300"
                  >
                    <X size={24} />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Price Chart Placeholder */}
                  <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-4 aspect-[4/3]">
                    <div className="h-full flex items-center justify-center">
                      <BarChart2 size={48} className="text-purple-500/50" />
                    </div>
                  </div>

                  {/* Token Metrics */}
                  <div className="space-y-4">
                    <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-4">
                      <h4 className="text-sm text-purple-300 mb-3">Token Metrics</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-purple-300">Market Cap</span>
                          <span className="text-purple-100">{formatUSD(token.marketCap)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-purple-300">24h Volume</span>
                          <span className="text-purple-100">{formatUSD(token.volume24h)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-purple-300">Holdings</span>
                          <span className="text-purple-100">{token.holdings} {token.symbol}</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-4">
                      <h4 className="text-sm text-purple-300 mb-3">Investment Summary</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-purple-300">Total Investment</span>
                          <span className="text-purple-100">
                            {formatUSD(token.purchaseHistory.reduce(
                              (sum, entry) => sum + (entry.amount * entry.price), 0
                            ))}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-purple-300">Current Value</span>
                          <span className="text-purple-100">
                            {formatUSD(token.holdings * token.price)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-purple-300">Total PNL</span>
                          <span className={calculatePNL(token) >= 0 ? 'text-green-400' : 'text-red-400'}>
                            {formatUSD(calculatePNL(token))}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Purchase History */}
                  <div className="md:col-span-2">
                    <h4 className="text-lg font-semibold text-purple-100 mb-4">Purchase History</h4>
                    <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg overflow-hidden">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-purple-500/20">
                            <th className="text-left py-3 px-4 text-purple-300">Date</th>
                            <th className="text-right py-3 px-4 text-purple-300">Amount</th>
                            <th className="text-right py-3 px-4 text-purple-300">Price</th>
                            <th className="text-right py-3 px-4 text-purple-300">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {token.purchaseHistory.map(entry => (
                            <tr key={entry.id} className="border-b border-purple-500/10">
                              <td className="py-3 px-4 text-purple-100">
                                {new Date(entry.date).toLocaleDateString()}
                              </td>
                              <td className="text-right py-3 px-4 text-purple-100">
                                {entry.amount} {token.symbol}
                              </td>
                              <td className="text-right py-3 px-4 text-purple-100">
                                {formatUSD(entry.price)}
                              </td>
                              <td className="text-right py-3 px-4 text-purple-100">
                                {formatUSD(entry.amount * entry.price)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
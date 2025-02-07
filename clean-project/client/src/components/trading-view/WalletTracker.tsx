import React, { useState, useEffect } from 'react';
import { Wallet, ExternalLink, Copy, CheckCircle, XCircle, Clock } from 'lucide-react';
import type { WalletDetails, WalletTransaction } from '../types/wallet';

const WalletTracker: React.FC = () => {
  const [selectedWallet, setSelectedWallet] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);

  // Mock data - replace with real data fetching
  const mockWallets: Record<string, WalletDetails> = {
    '0x1234...5678': {
      address: '0x1234...5678',
      isActive: true,
      lastTransaction: Date.now() - 300000,
      totalValue: 1234567.89,
      tokens: [
        { symbol: 'BTC', amount: 2.5, price: 46789.50, value: 116973.75, change24h: 2.45 },
        { symbol: 'ETH', amount: 15.8, price: 2456.78, value: 38817.12, change24h: -1.23 }
      ],
      transactions: [
        { id: '1', timestamp: Date.now() - 3600000, type: 'buy', tokenAmount: 0.5, price: 46789.50, status: 'completed', hash: '0xabc...' },
        { id: '2', timestamp: Date.now() - 7200000, type: 'sell', tokenAmount: 0.3, price: 46123.45, status: 'completed', hash: '0xdef...' }
      ],
      pnl: {
        total: 45678.90,
        percentage: 12.34,
        change24h: 2.45
      },
      liquidity: 987654.32
    }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      // Refresh wallet data
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const copyToClipboard = (address: string) => {
    navigator.clipboard.writeText(address);
    setCopiedAddress(address);
    setTimeout(() => setCopiedAddress(null), 2000);
  };

  const formatNumber = (num: number, decimals: number = 2) => {
    return num.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getStatusIcon = (status: WalletTransaction['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-400" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-400" />;
    }
  };

  return (
    <div className="bg-[#0D0B1F] rounded-lg border border-purple-900/30">
      <div className="p-4 border-b border-purple-900/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Wallet className="w-5 h-5 text-purple-400" />
            <h2 className="text-purple-100 font-semibold">Wallet Tracker</h2>
          </div>
          <div className="text-sm text-purple-300">
            Auto-refresh: <span className="text-purple-400">30s</span>
          </div>
        </div>
      </div>

      <div className="p-4">
        <div className="space-y-4">
          {Object.entries(mockWallets).map(([address, wallet]) => (
            <div
              key={address}
              className="bg-purple-900/20 rounded-lg p-4 hover:bg-purple-900/30 transition-colors cursor-pointer"
              onClick={() => {
                setSelectedWallet(address);
                setIsModalOpen(true);
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${wallet.isActive ? 'bg-green-400' : 'bg-red-400'}`} />
                  <div className="flex items-center space-x-1">
                    <span className="text-purple-100">{address}</span>
                    <button
                      className="p-1 hover:bg-purple-900/40 rounded"
                      onClick={(e) => {
                        e.stopPropagation();
                        copyToClipboard(address);
                      }}
                    >
                      {copiedAddress === address ? (
                        <CheckCircle className="w-4 h-4 text-green-400" />
                      ) : (
                        <Copy className="w-4 h-4 text-purple-400" />
                      )}
                    </button>
                    <a
                      href={`https://explorer.solana.com/address/${address}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 hover:bg-purple-900/40 rounded"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ExternalLink className="w-4 h-4 text-purple-400" />
                    </a>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-purple-100">
                    ${formatNumber(wallet.totalValue)}
                  </div>
                  <div className="text-xs text-purple-400">
                    Last active: {formatTime(wallet.lastTransaction)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Wallet Details Modal */}
      {isModalOpen && selectedWallet && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#0D0B1F] rounded-lg border border-purple-900/30 w-full max-w-3xl max-h-[90vh] overflow-auto">
            <div className="p-4 border-b border-purple-900/30 sticky top-0 bg-[#0D0B1F]">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-purple-100">Wallet Details</h3>
                <button
                  className="text-purple-400 hover:text-purple-300"
                  onClick={() => setIsModalOpen(false)}
                >
                  ×
                </button>
              </div>
            </div>

            <div className="p-4 space-y-6">
              {/* Wallet Overview */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-purple-900/20 p-4 rounded-lg">
                  <div className="text-sm text-purple-300 mb-1">Total Value</div>
                  <div className="text-lg font-medium text-purple-100">
                    ${formatNumber(mockWallets[selectedWallet].totalValue)}
                  </div>
                </div>
                <div className="bg-purple-900/20 p-4 rounded-lg">
                  <div className="text-sm text-purple-300 mb-1">24h PNL</div>
                  <div className={`text-lg font-medium ${
                    mockWallets[selectedWallet].pnl.change24h >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {mockWallets[selectedWallet].pnl.change24h >= 0 ? '+' : ''}
                    {formatNumber(mockWallets[selectedWallet].pnl.change24h)}%
                  </div>
                </div>
                <div className="bg-purple-900/20 p-4 rounded-lg">
                  <div className="text-sm text-purple-300 mb-1">Total Liquidity</div>
                  <div className="text-lg font-medium text-purple-100">
                    ${formatNumber(mockWallets[selectedWallet].liquidity)}
                  </div>
                </div>
              </div>

              {/* Token Holdings */}
              <div>
                <h4 className="text-purple-100 font-medium mb-2">Token Holdings</h4>
                <div className="space-y-2">
                  {mockWallets[selectedWallet].tokens.map((token) => (
                    <div key={token.symbol} className="bg-purple-900/20 p-3 rounded-lg">
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="text-purple-100">{token.symbol}</div>
                          <div className="text-sm text-purple-400">
                            {formatNumber(token.amount, 4)} tokens
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-purple-100">${formatNumber(token.value)}</div>
                          <div className={`text-sm ${
                            token.change24h >= 0 ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {token.change24h >= 0 ? '+' : ''}{formatNumber(token.change24h)}%
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Transaction History */}
              <div>
                <h4 className="text-purple-100 font-medium mb-2">Transaction History</h4>
                <div className="space-y-2">
                  {mockWallets[selectedWallet].transactions.map((tx) => (
                    <div key={tx.id} className="bg-purple-900/20 p-3 rounded-lg">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(tx.status)}
                          <div>
                            <div className={`text-sm font-medium ${
                              tx.type === 'buy' ? 'text-green-400' : 'text-red-400'
                            }`}>
                              {tx.type.toUpperCase()}
                            </div>
                            <div className="text-xs text-purple-400">
                              {formatTime(tx.timestamp)}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-purple-100">
                            {formatNumber(tx.tokenAmount, 4)} BTC
                          </div>
                          <div className="text-xs text-purple-400">
                            @ ${formatNumber(tx.price)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WalletTracker;
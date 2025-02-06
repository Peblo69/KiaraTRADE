import React, { useState } from 'react';
import { 
  Bell, Menu, Search, Zap, TrendingUp, TrendingDown, 
  ArrowUpRight, ArrowDownRight, BarChart2, Settings,
  Copy, Check, AlertTriangle, Download, X, Loader,
  Users, Activity, Star, Info, ChevronRight, RefreshCw,
  Key, Trash2, ArrowLeft
} from 'lucide-react';
import { WalletSection } from '@/components/kiara/WalletSection';
import { PortfolioTracker } from '@/components/kiara/PortfolioTracker';
import { PerformanceChart } from '@/components/kiara/PerformanceChart';
import { AnalyticsPanel } from '@/components/kiara/AnalyticsPanel';
import { CopyTradingPage } from '@/components/kiara/CopyTradingPage';
import { TradingSection } from '@/components/kiara/TradingSection';

function ProjectPage() {
  const [showCopyTrading, setShowCopyTrading] = useState(false);
  const [selectedToken, setSelectedToken] = useState<string | null>(null);
  const [selectedWallet, setSelectedWallet] = useState<string | null>(null);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [selectedWalletForWithdraw, setSelectedWalletForWithdraw] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [importData, setImportData] = useState({ publicKey: '', privateKey: '' });
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [walletToDelete, setWalletToDelete] = useState<string | null>(null);

  // Mock data
  const [wallets, setWallets] = useState([
    {
      id: '1',
      name: 'Main Trading',
      address: '7x8j...3kf9',
      balance: '12.45',
      balanceUSD: '2,490.00',
      isPrimary: true,
      chain: 'SOL',
      recentTransactions: [
        {
          id: 'tx1',
          type: 'incoming',
          amount: '5.2',
          timestamp: Date.now() - 3600000,
          from: '8k9l...2m3n',
          to: '7x8j...3kf9'
        }
      ]
    },
    {
      id: '2',
      name: 'DeFi Wallet',
      address: '9h2k...7m4n',
      balance: '3.21',
      balanceUSD: '642.00',
      isPrimary: false,
      chain: 'SOL',
      recentTransactions: []
    }
  ]);

  const [tokens] = useState([
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

  // Utility functions
  const formatUSD = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  const calculatePNL = (token: any) => {
    const totalInvestment = token.purchaseHistory.reduce(
      (sum: number, entry: any) => sum + (entry.amount * entry.price), 0
    );
    const currentValue = token.holdings * token.price;
    return currentValue - totalInvestment;
  };

  if (showCopyTrading) {
    return (
      <div className="min-h-screen bg-[#0B0B1E] grid-bg">
        <header className="neon-border bg-[#0B0B1E]/90 backdrop-blur-md border-b border-purple-500/20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center h-16">
              <button
                onClick={() => setShowCopyTrading(false)}
                className="mr-4 text-purple-400 hover:text-purple-300 transition-colors"
              >
                <ArrowLeft size={24} />
              </button>
              <h1 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">
                Copy Trading
              </h1>
            </div>
          </div>
        </header>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-4">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-400 to-blue-400 flex items-center justify-center">
                      <Users className="text-white" size={20} />
                    </div>
                    <div>
                      <div className="text-purple-100 font-medium">Trader {i}</div>
                      <div className="text-purple-400 text-sm">@trader{i}</div>
                    </div>
                  </div>
                  <button className="px-3 py-1 text-xs rounded-md bg-purple-600 text-white hover:bg-purple-500">
                    Copy
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="bg-purple-900/40 rounded-lg p-3">
                    <div className="text-purple-300 text-sm mb-1">Win Rate</div>
                    <div className="text-green-400 font-medium flex items-center gap-1">
                      <TrendingUp size={14} />
                      {85 + i}%
                    </div>
                  </div>
                  <div className="bg-purple-900/40 rounded-lg p-3">
                    <div className="text-purple-300 text-sm mb-1">Risk Level</div>
                    <div className="text-yellow-400 font-medium flex items-center gap-1">
                      <AlertTriangle size={14} />
                      Medium
                    </div>
                  </div>
                </div>
                <div className="text-sm text-purple-300">
                  Last 30 days performance:
                  <span className="text-green-400 ml-2">+{12 + i * 5}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0B1E] grid-bg">
      {/* Header */}
      <header className="neon-border bg-[#0B0B1E]/90 backdrop-blur-md border-b border-purple-500/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <button className="lg:hidden p-2 rounded-md text-purple-400 hover:text-purple-300 hover:bg-purple-500/10">
                <Menu size={24} />
              </button>
              <div className="flex-shrink-0 flex items-center">
                <img
                  src="https://images.unsplash.com/photo-1614854262318-831574f15f1f?auto=format&fit=crop&w=40&h=40"
                  alt="Kiara Vision"
                  className="h-8 w-8 rounded-full neon-glow"
                />
                <span className="ml-2 text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">
                  Kiara Vision
                </span>
              </div>
            </div>

            <div className="flex-1 max-w-xl px-8 hidden lg:flex">
              <div className="w-full relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-purple-400" />
                </div>
                <input
                  type="text"
                  className="block w-full pl-10 pr-3 py-2 bg-purple-900/10 border border-purple-500/20 rounded-lg 
                         text-purple-100 placeholder-purple-400/50 focus:outline-none focus:border-purple-500/50
                         focus:ring-1 focus:ring-purple-500/30"
                  placeholder="Search tokens..."
                />
              </div>
            </div>

            <div className="flex items-center gap-4">
              <button className="p-2 rounded-md text-purple-400 hover:text-purple-300 hover:bg-purple-500/10">
                <Bell size={24} />
              </button>
              <button 
                onClick={() => setShowCopyTrading(true)}
                className="cyber-button flex items-center gap-2"
              >
                <Zap size={18} className="text-yellow-400" />
                Copy Trading
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-8">
            <WalletSection wallets={wallets} />
            <PerformanceChart tokens={tokens} />
            <TradingSection />
          </div>
          <div className="space-y-8">
            <PortfolioTracker tokens={tokens} calculatePNL={calculatePNL} formatUSD={formatUSD} />
            <AnalyticsPanel />
          </div>
        </div>
      </main>

      {/* Modals */}
      {showImport && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-kiara-dark/80 rounded-xl p-8 w-96">
            <h2 className="text-lg font-bold text-purple-100 mb-4">Import Wallet</h2>
            <form>
              <div className="mb-4">
                <label className="block text-purple-400/70 text-sm mb-2" htmlFor="publicKey">Public Key</label>
                <input
                  type="text"
                  id="publicKey"
                  value={importData.publicKey}
                  onChange={(e) => setImportData({ ...importData, publicKey: e.target.value })}
                  className="w-full bg-purple-900/10 border border-purple-500/20 text-purple-100 rounded-lg px-3 py-2 focus:outline-none focus:border-purple-500/50"
                />
              </div>
              <div className="mb-4">
                <label className="block text-purple-400/70 text-sm mb-2" htmlFor="privateKey">Private Key</label>
                <input
                  type="password"
                  id="privateKey"
                  value={importData.privateKey}
                  onChange={(e) => setImportData({ ...importData, privateKey: e.target.value })}
                  className="w-full bg-purple-900/10 border border-purple-500/20 text-purple-100 rounded-lg px-3 py-2 focus:outline-none focus:border-purple-500/50"
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  setImportSuccess(true);
                  setShowImport(false);
                }}
                className="cyber-button"
              >
                Import
              </button>
              {importError && <p className="text-red-500 text-sm mt-2">{importError}</p>}
              {importSuccess && <p className="text-green-500 text-sm mt-2">Wallet imported successfully!</p>}
            </form>
          </div>
        </div>
      )}

      {showDeleteModal && walletToDelete && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-kiara-dark/80 rounded-xl p-8 w-96">
            <h2 className="text-lg font-bold text-purple-100 mb-4">Delete Wallet</h2>
            <p className="text-purple-400/70 text-sm mb-4">Are you sure you want to delete the wallet "{walletToDelete}"?</p>
            <div className="flex justify-end gap-4">
              <button
                onClick={() => { setShowDeleteModal(false); setWalletToDelete(null); }}
                className="cyber-button bg-gray-600 hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setWalletToDelete(null);
                }}
                className="cyber-button bg-red-600 hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {showWithdraw && selectedWalletForWithdraw && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-kiara-dark/80 rounded-xl p-8 w-96">
            <h2 className="text-lg font-bold text-purple-100 mb-4">Withdraw from {selectedWalletForWithdraw}</h2>
            <button onClick={() => setShowWithdraw(false)} className="cyber-button">Close</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProjectPage;
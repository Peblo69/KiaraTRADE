import React, { useState } from 'react';
import { 
  Copy, 
  ExternalLink, 
  Plus, 
  Wallet, 
  Eye, 
  EyeOff, 
  Check, 
  AlertTriangle, 
  Settings, 
  RefreshCw, 
  Download, 
  Upload,
  ArrowDownRight,
  ArrowUpRight,
  Key,
  BookOpen,
  Star,
  X,
  Trash2
} from 'lucide-react';
import { WithdrawModal } from './WithdrawModal';

interface WalletData {
  id: string;
  address: string;
  balance: string;
  balanceUSD: string;
  name: string;
  isPrimary: boolean;
  privateKey?: string;
  isNew?: boolean;
  chain: 'SOL' | 'ETH';
  recentTransactions: Transaction[];
}

interface Transaction {
  id: string;
  type: 'incoming' | 'outgoing';
  amount: string;
  timestamp: number;
  from: string;
  to: string;
}

export function WalletSection() {
  const [wallets, setWallets] = useState<WalletData[]>([
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

  const [showImport, setShowImport] = useState(false);
  const [importData, setImportData] = useState({ publicKey: '', privateKey: '' });
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [selectedWallet, setSelectedWallet] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [walletToDelete, setWalletToDelete] = useState<string | null>(null);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [selectedWalletForWithdraw, setSelectedWalletForWithdraw] = useState<string | null>(null);

  const totalBalance = wallets.reduce((sum, wallet) => 
    sum + parseFloat(wallet.balanceUSD.replace(',', '')), 0
  ).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const handleImport = () => {
    setShowImport(true);
    setImportError(null);
    setImportSuccess(false);
    setImportData({ publicKey: '', privateKey: '' });
  };

  const handleImportSubmit = () => {
    // Validate keys
    if (!importData.publicKey || !importData.privateKey) {
      setImportError('Both public and private keys are required');
      return;
    }

    // Simple validation - in production you'd want to verify these properly
    if (importData.publicKey.length < 32 || importData.privateKey.length < 32) {
      setImportError('Invalid key format');
      return;
    }

    // Mock successful import
    const newWallet: WalletData = {
      id: `wallet-${Date.now()}`,
      address: importData.publicKey.slice(0, 4) + '...' + importData.publicKey.slice(-4),
      balance: '0.00',
      balanceUSD: '0.00',
      name: 'Imported Wallet',
      isPrimary: false,
      chain: 'SOL',
      recentTransactions: []
    };

    setWallets([...wallets, newWallet]);
    setImportSuccess(true);
    
    // Close modal after success message
    setTimeout(() => {
      setShowImport(false);
      setImportSuccess(false);
    }, 2000);
  };

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  const setPrimaryWallet = (id: string) => {
    setWallets(wallets.map(wallet => ({
      ...wallet,
      isPrimary: wallet.id === id,
    })));
  };

  const handleDeleteClick = (walletId: string) => {
    const wallet = wallets.find(w => w.id === walletId);
    if (wallet) {
      setWalletToDelete(walletId);
      setShowDeleteModal(true);
      setDeleteConfirmation('');
      setDeleteError(null);
    }
  };

  const handleDeleteConfirm = () => {
    const wallet = wallets.find(w => w.id === walletToDelete);
    if (!wallet) return;

    // Check if wallet has balance
    const balance = parseFloat(wallet.balance);
    if (balance > 0) {
      setDeleteError('Cannot delete wallet with existing funds. Please transfer all assets before deletion.');
      return;
    }

    // Validate confirmation text
    if (deleteConfirmation !== 'YES') {
      setDeleteError("Please type 'YES' to confirm deletion");
      return;
    }

    // Proceed with deletion
    setWallets(wallets.filter(w => w.id !== walletToDelete));
    setShowDeleteModal(false);
    setWalletToDelete(null);
    setDeleteConfirmation('');
    setSelectedWallet(null);
  };

  const handleWithdrawClick = (walletId: string) => {
    setSelectedWalletForWithdraw(walletId);
    setShowWithdraw(true);
  };

  const handleWithdrawSuccess = () => {
    // In a real implementation, you would fetch updated balances from the API
    // For now, we'll just close the modal
    setShowWithdraw(false);
    setSelectedWalletForWithdraw(null);
  };

  return (
    <div className="space-y-6">
      {/* Overview Section */}
      <div className="glass-card rounded-xl p-6 bg-kiara-dark/80 border border-purple-500/20">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">
              Wallet Overview
            </h2>
            <p className="text-purple-300 mt-1">Total Balance: ${totalBalance}</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleImport}
              className="cyber-button flex items-center gap-2"
            >
              <Key size={18} />
              Import Wallet
            </button>
          </div>
        </div>

        {/* Import Modal */}
        {showImport && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-kiara-dark/95 border border-purple-500/30 rounded-xl p-6 w-full max-w-md">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-purple-100">Import Wallet</h3>
                <button
                  onClick={() => setShowImport(false)}
                  className="text-purple-400 hover:text-purple-300"
                >
                  <X size={20} />
                </button>
              </div>

              {importSuccess ? (
                <div className="text-center py-4">
                  <div className="flex items-center justify-center mb-4">
                    <Check size={48} className="text-green-400" />
                  </div>
                  <p className="text-green-400 font-semibold">Wallet imported successfully!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-purple-300 mb-1">
                      Public Key
                    </label>
                    <input
                      type="text"
                      value={importData.publicKey}
                      onChange={(e) => setImportData({ ...importData, publicKey: e.target.value })}
                      className="w-full bg-purple-900/20 border border-purple-500/30 rounded-lg px-3 py-2 text-purple-100 placeholder-purple-400/50"
                      placeholder="Enter your public key"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-purple-300 mb-1">
                      Private Key
                    </label>
                    <input
                      type="password"
                      value={importData.privateKey}
                      onChange={(e) => setImportData({ ...importData, privateKey: e.target.value })}
                      className="w-full bg-purple-900/20 border border-purple-500/30 rounded-lg px-3 py-2 text-purple-100 placeholder-purple-400/50"
                      placeholder="Enter your private key"
                    />
                  </div>

                  {importError && (
                    <div className="text-red-400 text-sm flex items-center gap-2">
                      <AlertTriangle size={16} />
                      {importError}
                    </div>
                  )}

                  <button
                    onClick={handleImportSubmit}
                    className="w-full cyber-button py-3"
                  >
                    Import Wallet
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-kiara-dark/95 border border-purple-500/30 rounded-xl p-6 w-full max-w-md">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-purple-100">Delete Wallet</h3>
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="text-purple-400 hover:text-purple-300"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <div className="text-red-500 font-semibold">
                  WARNING: This action cannot be undone. Are you sure you want to delete this wallet?
                </div>

                <div>
                  <label className="block text-sm font-medium text-purple-300 mb-1">
                    Type 'YES' to confirm deletion
                  </label>
                  <input
                    type="text"
                    value={deleteConfirmation}
                    onChange={(e) => setDeleteConfirmation(e.target.value)}
                    className="w-full bg-purple-900/20 border border-purple-500/30 rounded-lg px-3 py-2 text-purple-100"
                    placeholder="Type 'YES' to confirm"
                  />
                </div>

                {deleteError && (
                  <div className="text-red-400 text-sm flex items-center gap-2">
                    <AlertTriangle size={16} />
                    {deleteError}
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowDeleteModal(false)}
                    className="flex-1 cyber-button"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteConfirm}
                    className="flex-1 cyber-button bg-red-500/20 border-red-500/30 text-red-400 hover:bg-red-500/30"
                  >
                    Delete Wallet
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Wallets Grid */}
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
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <Wallet className="text-purple-400" size={24} />
                  <div>
                    <div className="font-semibold text-purple-100">{wallet.name}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="font-mono text-sm text-purple-300">{wallet.address}</span>
                      <button
                        onClick={() => copyToClipboard(wallet.address, `address-${wallet.id}`)}
                        className="text-purple-400 hover:text-purple-300"
                      >
                        {copied === `address-${wallet.id}` ? (
                          <Check size={16} className="text-green-400" />
                        ) : (
                          <Copy size={16} />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedWallet(selectedWallet === wallet.id ? null : wallet.id)}
                  className="text-purple-400 hover:text-purple-300"
                >
                  <Settings size={20} />
                </button>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-purple-300">Balance</span>
                  <div className="text-right">
                    <div className="font-semibold text-purple-100">{wallet.balance} SOL</div>
                    <div className="text-sm text-purple-300">${wallet.balanceUSD}</div>
                  </div>
                </div>

                <button
                  onClick={() => handleWithdrawClick(wallet.id)}
                  className="w-full cyber-button py-2 mt-2 flex items-center justify-center gap-2"
                >
                  <Download size={16} />
                  Withdraw
                </button>

                {selectedWallet === wallet.id && (
                  <div className="pt-3 border-t border-purple-500/20 mt-3 space-y-2">
                    <button className="w-full text-left px-3 py-2 rounded text-purple-300 hover:bg-purple-500/10 transition-colors flex items-center gap-2">
                      <RefreshCw size={16} />
                      Refresh Balance
                    </button>
                    <button className="w-full text-left px-3 py-2 rounded text-purple-300 hover:bg-purple-500/10 transition-colors flex items-center gap-2">
                      <Download size={16} />
                      Export Private Key
                    </button>
                    {!wallet.isPrimary && (
                      <>
                        <button
                          onClick={() => setPrimaryWallet(wallet.id)}
                          className="w-full text-left px-3 py-2 rounded text-purple-300 hover:bg-purple-500/10 transition-colors flex items-center gap-2"
                        >
                          <Star size={16} />
                          Set as Primary
                        </button>
                        <button
                          onClick={() => handleDeleteClick(wallet.id)}
                          className="w-full text-left px-3 py-2 rounded text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-2"
                        >
                          <Trash2 size={16} />
                          Delete Wallet
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>

              {wallet.recentTransactions.length > 0 && (
                <div className="mt-4 pt-4 border-t border-purple-500/20">
                  <div className="text-sm font-semibold text-purple-300 mb-2">Recent Activity</div>
                  {wallet.recentTransactions.map(tx => (
                    <div key={tx.id} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        {tx.type === 'incoming' ? (
                          <ArrowDownRight size={16} className="text-green-400" />
                        ) : (
                          <ArrowUpRight size={16} className="text-red-400" />
                        )}
                        <span className="text-purple-200">
                          {tx.type === 'incoming' ? 'Received' : 'Sent'} {tx.amount} SOL
                        </span>
                      </div>
                      <span className="text-purple-400">
                        {new Date(tx.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Withdraw Modal */}
      {showWithdraw && selectedWalletForWithdraw && (
        <WithdrawModal
          walletId={selectedWalletForWithdraw}
          balance={wallets.find(w => w.id === selectedWalletForWithdraw)?.balance || '0'}
          onClose={() => {
            setShowWithdraw(false);
            setSelectedWalletForWithdraw(null);
          }}
          onSuccess={handleWithdrawSuccess}
        />
      )}
    </div>
  );
}
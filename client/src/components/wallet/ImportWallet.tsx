import React, { useState } from 'react';
import { ArrowLeft, Upload, AlertCircle } from 'lucide-react';

interface ImportWalletProps {
  onBack: () => void;
}

export function ImportWallet({ onBack }: ImportWalletProps) {
  const [privateKey, setPrivateKey] = useState('');
  const [error, setError] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  const handleImport = () => {
    if (!privateKey.trim()) {
      setError('Please enter a private key');
      return;
    }
    // TODO: Implement actual wallet import validation
    setError('Invalid private key. Please check your input.');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    // TODO: Handle file drop
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-6">
      <div className="relative group max-w-md w-full">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl blur opacity-25 group-hover:opacity-40 transition duration-1000"></div>
        <div className="relative neon-border bg-kiara-dark/80 rounded-xl p-6">
          <button
            onClick={onBack}
            className="p-2 rounded-lg bg-purple-900/20 text-purple-400 hover:bg-purple-900/30 mb-4"
          >
            <ArrowLeft size={20} />
          </button>

          <h2 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400 mb-6">
            Import Wallet
          </h2>

          <div className="space-y-4">
            <div>
              <label className="text-sm text-purple-300">Private Key or Mnemonic</label>
              <textarea
                value={privateKey}
                onChange={(e) => setPrivateKey(e.target.value)}
                className="w-full bg-purple-900/20 border border-purple-500/30 rounded-lg px-4 py-2 text-purple-100 focus:outline-none focus:border-purple-500 mt-1 min-h-[100px]"
                placeholder="Enter your private key or mnemonic phrase..."
              />
            </div>

            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                isDragging
                  ? 'border-purple-500 bg-purple-900/30'
                  : 'border-purple-500/30 bg-purple-900/20'
              }`}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
            >
              <Upload className="w-8 h-8 text-purple-400 mx-auto mb-2" />
              <p className="text-purple-300">
                Drop your wallet backup file here
                <br />
                <span className="text-sm text-purple-400">or click to browse</span>
              </p>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                <AlertCircle size={16} />
                <span className="text-sm">{error}</span>
              </div>
            )}

            <button
              onClick={handleImport}
              className="w-full bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-500 transition-all duration-300 hover:scale-105 transform"
            >
              Import Wallet
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

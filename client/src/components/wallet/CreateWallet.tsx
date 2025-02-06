import React, { useState } from 'react';
import { ArrowLeft, AlertTriangle, Download, Copy, QrCode } from 'lucide-react';

interface CreateWalletProps {
  onBack: () => void;
}

export function CreateWallet({ onBack }: CreateWalletProps) {
  const [showWarning, setShowWarning] = useState(true);
  const [wallet, setWallet] = useState<{ publicKey: string; privateKey: string } | null>(null);

  const handleCreateWallet = () => {
    // TODO: Implement actual wallet creation
    setWallet({
      publicKey: "DummyPublicKey123...",
      privateKey: "DummyPrivateKey456..."
    });
  };

  if (showWarning) {
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

            <div className="flex items-center gap-2 mb-6 text-yellow-500">
              <AlertTriangle className="w-6 h-6" />
              <h2 className="text-xl font-bold">Important Warning</h2>
            </div>

            <div className="space-y-4">
              <p className="text-purple-200">
                Your private key will be shown only once. Make sure to save it securely.
                We cannot recover it for you.
              </p>

              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                <p className="text-yellow-500 text-sm">
                  Once you proceed, you will be responsible for securing your private key.
                  Lost keys cannot be recovered.
                </p>
              </div>

              <button
                onClick={() => setShowWarning(false)}
                className="w-full bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-500 transition-all duration-300 hover:scale-105 transform mt-4"
              >
                I Understand
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
            Create New Wallet
          </h2>

          {!wallet ? (
            <button
              onClick={handleCreateWallet}
              className="w-full bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-500 transition-all duration-300 hover:scale-105 transform"
            >
              Generate Wallet
            </button>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="text-sm text-purple-300">Public Key</label>
                <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-3 mt-1">
                  <code className="text-purple-100 text-sm break-all">
                    {wallet.publicKey}
                  </code>
                </div>
              </div>

              <div>
                <label className="text-sm text-purple-300">Private Key</label>
                <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-3 mt-1">
                  <code className="text-purple-100 text-sm break-all">
                    {wallet.privateKey}
                  </code>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <button className="flex items-center justify-center gap-1 bg-purple-900/20 text-purple-300 p-2 rounded-lg border border-purple-500/30 hover:bg-purple-900/30 transition-all duration-300">
                  <Download size={16} />
                  JSON
                </button>
                <button className="flex items-center justify-center gap-1 bg-purple-900/20 text-purple-300 p-2 rounded-lg border border-purple-500/30 hover:bg-purple-900/30 transition-all duration-300">
                  <Copy size={16} />
                  Copy
                </button>
                <button className="flex items-center justify-center gap-1 bg-purple-900/20 text-purple-300 p-2 rounded-lg border border-purple-500/30 hover:bg-purple-900/30 transition-all duration-300">
                  <QrCode size={16} />
                  QR
                </button>
              </div>

              <button className="w-full bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-500 transition-all duration-300 hover:scale-105 transform">
                Proceed to Dashboard
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

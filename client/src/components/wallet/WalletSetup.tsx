import React, { useState } from 'react';
import { Shield, Download, Copy, QrCode } from 'lucide-react';
import { CreateWallet } from './CreateWallet';
import { ImportWallet } from './ImportWallet';

export function WalletSetup() {
  const [step, setStep] = useState<'menu' | 'create' | 'import'>('menu');

  if (step === 'create') {
    return <CreateWallet onBack={() => setStep('menu')} />;
  }

  if (step === 'import') {
    return <ImportWallet onBack={() => setStep('menu')} />;
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-6">
      <div className="relative group max-w-md w-full">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl blur opacity-25 group-hover:opacity-40 transition duration-1000"></div>
        <div className="relative neon-border bg-kiara-dark/80 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-6">
            <Shield className="w-6 h-6 text-purple-400" />
            <h2 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">
              Wallet Setup
            </h2>
          </div>

          <div className="space-y-4">
            <button
              onClick={() => setStep('create')}
              className="w-full bg-purple-600 text-white px-4 py-3 rounded-lg hover:bg-purple-500 transition-all duration-300 hover:scale-105 transform group"
            >
              <div className="font-semibold">Create New Wallet</div>
              <div className="text-sm text-purple-200 group-hover:text-purple-100">
                Generate a new Solana wallet
              </div>
            </button>

            <button
              onClick={() => setStep('import')}
              className="w-full bg-purple-900/20 text-purple-300 px-4 py-3 rounded-lg border border-purple-500/30 hover:bg-purple-900/30 transition-all duration-300 hover:scale-105 transform group"
            >
              <div className="font-semibold">Import Existing Wallet</div>
              <div className="text-sm text-purple-400 group-hover:text-purple-300">
                Import from private key or JSON
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { AlertTriangle, Check, Loader, X } from 'lucide-react';

interface WithdrawModalProps {
  walletId: string;
  balance: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function WithdrawModal({ walletId, balance, onClose, onSuccess }: WithdrawModalProps) {
  const [amount, setAmount] = useState('');
  const [destinationAddress, setDestinationAddress] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const validateInputs = async (): Promise<boolean> => {
    // Reset error state
    setError(null);

    // Amount validation
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid amount');
      return false;
    }

    const availableBalance = parseFloat(balance);
    if (numAmount > availableBalance) {
      setError('Insufficient funds');
      return false;
    }

    // Basic wallet address validation
    if (destinationAddress.length < 32 || destinationAddress.length > 44) {
      setError('Invalid wallet address');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const isValid = await validateInputs();
      if (!isValid) {
        setIsLoading(false);
        return;
      }

      // Mock successful transaction
      setTxHash('2ZuGCHXmS9kpxqJ7N4zVmGmYw3B5XyCxF8YEqDfhP1Zy');
      setSuccess(true);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-kiara-dark/95 border border-purple-500/30 rounded-xl p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold text-purple-100">Withdraw SOL</h3>
          <button
            onClick={onClose}
            className="text-purple-400 hover:text-purple-300"
          >
            <X size={20} />
          </button>
        </div>

        {success ? (
          <div className="text-center py-4">
            <div className="flex items-center justify-center mb-4">
              <Check size={48} className="text-green-400" />
            </div>
            <p className="text-green-400 font-semibold mb-2">Transaction Successful!</p>
            <p className="text-sm text-purple-300">
              Transaction Hash: <br />
              <span className="font-mono text-xs">{txHash}</span>
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-purple-300 mb-1">
                Amount (SOL)
              </label>
              <input
                type="number"
                step="0.000001"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-purple-900/20 border border-purple-500/30 rounded-lg px-3 py-2 text-purple-100"
                placeholder="0.00"
              />
              <p className="text-sm text-purple-400 mt-1">
                Available: {balance} SOL
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-purple-300 mb-1">
                Wallet Address
              </label>
              <input
                type="text"
                value={destinationAddress}
                onChange={(e) => setDestinationAddress(e.target.value)}
                className="w-full bg-purple-900/20 border border-purple-500/30 rounded-lg px-3 py-2 text-purple-100"
                placeholder="Enter destination wallet address"
              />
            </div>

            {error && (
              <div className="text-red-400 text-sm flex items-center gap-2">
                <AlertTriangle size={16} />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full cyber-button py-3 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader size={16} className="animate-spin" />
                  Processing...
                </>
              ) : (
                'Confirm Withdrawal'
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
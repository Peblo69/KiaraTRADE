import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Bell, Activity, Wallet, ChevronRight, ArrowUpDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import CryptoIcon from "@/components/CryptoIcon";

interface WalletData {
  address: string;
  balance: number;
  tokens: TokenHolding[];
  transactions: Transaction[];
  pnl: {
    daily: number;
    weekly: number;
    monthly: number;
  };
}

interface TokenHolding {
  mint: string;
  amount: number;
  symbol: string;
  price: number;
  value: number;
  pnl24h: number;
}

interface Transaction {
  signature: string;
  type: 'buy' | 'sell' | 'transfer';
  tokenSymbol: string;
  amount: number;
  price: number;
  timestamp: number;
  value: number;
}

interface Alert {
  id: string;
  type: 'price' | 'volume' | 'transaction';
  condition: 'above' | 'below' | 'equals';
  value: number;
  token?: string;
  enabled: boolean;
}

export default function WalletTrackingPage() {
  const [walletAddress, setWalletAddress] = useState<string>("");
  const [trackedWallets, setTrackedWallets] = useState<string[]>([]);
  const [selectedWallet, setSelectedWallet] = useState<string | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const { toast } = useToast();

  const { data: walletData, isLoading } = useQuery<WalletData>({
    queryKey: [`/api/wallet/${selectedWallet}`],
    enabled: !!selectedWallet,
  });

  const handleAddWallet = () => {
    if (!walletAddress) {
      toast({
        title: "Error",
        description: "Please enter a wallet address",
        variant: "destructive",
      });
      return;
    }

    if (trackedWallets.includes(walletAddress)) {
      toast({
        title: "Error",
        description: "Wallet is already being tracked",
        variant: "destructive",
      });
      return;
    }

    setTrackedWallets([...trackedWallets, walletAddress]);
    setWalletAddress("");
  };

  const handleCreateAlert = (type: Alert['type']) => {
    const newAlert: Alert = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      condition: 'above',
      value: 0,
      enabled: true,
    };
    setAlerts([...alerts, newAlert]);
  };

  return (
    <div className="container mx-auto p-6 min-h-screen bg-gradient-to-b from-gray-900 to-black">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold text-white mb-2">Wallet Tracking</h1>
        <p className="text-gray-400">
          Track multiple wallets, monitor transactions, and set custom alerts.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <Card className="p-6 bg-gray-800/50 border-gray-700">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Wallet className="w-5 h-5" />
            Add Wallet
          </h2>
          <div className="flex gap-2">
            <Input
              placeholder="Enter wallet address"
              value={walletAddress}
              onChange={(e) => setWalletAddress(e.target.value)}
              className="flex-1"
            />
            <Button onClick={handleAddWallet}>
              <Plus className="w-4 h-4 mr-2" />
              Add
            </Button>
          </div>
        </Card>

        <Card className="p-6 bg-gray-800/50 border-gray-700">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Portfolio Overview
          </h2>
          {selectedWallet && walletData ? (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Total Balance</span>
                <span className="text-xl font-semibold">${walletData.balance.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">24h PNL</span>
                <span className={`text-lg ${walletData.pnl.daily >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {walletData.pnl.daily >= 0 ? '+' : ''}{walletData.pnl.daily.toFixed(2)}%
                </span>
              </div>
            </div>
          ) : (
            <p className="text-gray-500">Select a wallet to view portfolio stats</p>
          )}
        </Card>

        <Card className="p-6 bg-gray-800/50 border-gray-700">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Alerts
          </h2>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full">
                Configure Alerts
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] bg-gray-800 text-white">
              <DialogHeader>
                <DialogTitle>Alert Settings</DialogTitle>
                <DialogDescription className="text-gray-400">
                  Create custom alerts for price movements, volume changes, and transactions.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-4">
                  <Button
                    variant="outline"
                    onClick={() => handleCreateAlert('price')}
                    className="w-full"
                  >
                    + Add Price Alert
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleCreateAlert('volume')}
                    className="w-full"
                  >
                    + Add Volume Alert
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleCreateAlert('transaction')}
                    className="w-full"
                  >
                    + Add Transaction Alert
                  </Button>
                </div>
                {alerts.map((alert) => (
                  <div key={alert.id} className="flex items-center gap-2 p-2 border border-gray-700 rounded-lg">
                    <Select
                      value={alert.condition}
                      onValueChange={(value: any) => {
                        const updatedAlerts = alerts.map(a =>
                          a.id === alert.id ? { ...a, condition: value } : a
                        );
                        setAlerts(updatedAlerts);
                      }}
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Select condition" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectLabel>Conditions</SelectLabel>
                          <SelectItem value="above">Above</SelectItem>
                          <SelectItem value="below">Below</SelectItem>
                          <SelectItem value="equals">Equals</SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      value={alert.value}
                      onChange={(e) => {
                        const updatedAlerts = alerts.map(a =>
                          a.id === alert.id ? { ...a, value: parseFloat(e.target.value) } : a
                        );
                        setAlerts(updatedAlerts);
                      }}
                      className="w-24"
                    />
                  </div>
                ))}
              </div>
            </DialogContent>
          </Dialog>
        </Card>
      </div>

      <Card className="p-6 bg-gray-800/50 border-gray-700">
        <h2 className="text-xl font-semibold mb-4">Tracked Wallets</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {trackedWallets.map((wallet) => (
            <Card 
              key={wallet} 
              className={`p-4 bg-gray-700/50 cursor-pointer transition-colors hover:bg-gray-600/50 ${
                selectedWallet === wallet ? 'ring-2 ring-purple-500' : ''
              }`}
              onClick={() => setSelectedWallet(wallet)}
            >
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium text-sm text-gray-300">
                    {wallet.slice(0, 4)}...{wallet.slice(-4)}
                  </p>
                  {selectedWallet === wallet && walletData && (
                    <div className="mt-2 space-y-1">
                      <p className="text-sm text-gray-400">
                        Balance: ${walletData.balance.toFixed(2)}
                      </p>
                      <p className="text-sm text-gray-400">
                        Tokens: {walletData.tokens.length}
                      </p>
                    </div>
                  )}
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </div>
            </Card>
          ))}
        </div>
      </Card>

      {selectedWallet && walletData && (
        <div className="mt-8 space-y-6">
          <Card className="p-6 bg-gray-800/50 border-gray-700">
            <h3 className="text-xl font-semibold mb-4">Token Holdings</h3>
            <div className="space-y-4">
              {walletData.tokens.map((token) => (
                <div key={token.mint} className="flex items-center justify-between p-3 bg-gray-700/30 rounded-lg">
                  <div className="flex items-center gap-3">
                    <CryptoIcon symbol={token.symbol} size="sm" />
                    <div>
                      <p className="font-medium">{token.symbol}</p>
                      <p className="text-sm text-gray-400">{token.amount.toFixed(4)} tokens</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">${token.value.toFixed(2)}</p>
                    <p className={`text-sm ${token.pnl24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {token.pnl24h >= 0 ? '+' : ''}{token.pnl24h.toFixed(2)}%
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6 bg-gray-800/50 border-gray-700">
            <h3 className="text-xl font-semibold mb-4">Recent Transactions</h3>
            <div className="space-y-4">
              {walletData.transactions.map((tx) => (
                <div key={tx.signature} className="flex items-center justify-between p-3 bg-gray-700/30 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${
                      tx.type === 'buy' ? 'bg-green-500/20 text-green-400' :
                      tx.type === 'sell' ? 'bg-red-500/20 text-red-400' :
                      'bg-blue-500/20 text-blue-400'
                    }`}>
                      <ArrowUpDown className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-medium">{tx.tokenSymbol}</p>
                      <p className="text-sm text-gray-400">
                        {new Date(tx.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">${tx.value.toFixed(2)}</p>
                    <p className="text-sm text-gray-400">
                      {tx.amount.toFixed(4)} tokens
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
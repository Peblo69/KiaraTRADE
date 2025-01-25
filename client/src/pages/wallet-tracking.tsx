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
} from "@/components/ui/dialog";
import { Plus, Bell, Activity, Wallet } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface WalletData {
  address: string;
  balance: number;
  tokens: TokenHolding[];
  transactions: Transaction[];
}

interface TokenHolding {
  mint: string;
  amount: number;
  symbol: string;
  price: number;
}

interface Transaction {
  signature: string;
  type: 'buy' | 'sell';
  tokenSymbol: string;
  amount: number;
  price: number;
  timestamp: number;
}

export default function WalletTrackingPage() {
  const [walletAddress, setWalletAddress] = useState<string>("");
  const [trackedWallets, setTrackedWallets] = useState<string[]>([]);
  const { toast } = useToast();

  const { data: walletData, isLoading } = useQuery<WalletData>({
    queryKey: [`/api/wallet/${walletAddress}`],
    enabled: !!walletAddress && trackedWallets.includes(walletAddress),
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
          {/* Portfolio stats will go here */}
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
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Alert Settings</DialogTitle>
              </DialogHeader>
              {/* Alert configuration form will go here */}
            </DialogContent>
          </Dialog>
        </Card>
      </div>

      <Card className="p-6 bg-gray-800/50 border-gray-700">
        <h2 className="text-xl font-semibold mb-4">Tracked Wallets</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {trackedWallets.map((wallet) => (
            <Card key={wallet} className="p-4 bg-gray-700/50">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium text-sm text-gray-300">
                    {wallet.slice(0, 4)}...{wallet.slice(-4)}
                  </p>
                  {/* Wallet stats will go here */}
                </div>
                <Button variant="ghost" size="sm">
                  View Details
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </Card>
    </div>
  );
}

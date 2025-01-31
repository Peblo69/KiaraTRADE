import { FC } from 'react';
import { useWallet } from '@/lib/wallet';
import { Button } from "@/components/ui/button";
import { Loader2, Wallet } from "lucide-react";

export const WalletButton: FC = () => {
  const { connect, disconnect, isConnecting, isDisconnecting, publicKey } = useWallet();

  const handleClick = async () => {
    try {
      if (publicKey) {
        await disconnect();
      } else {
        await connect();
      }
    } catch (error) {
      console.error('Wallet connection error:', error);
    }
  };

  if (isConnecting || isDisconnecting) {
    return (
      <Button disabled variant="outline" className="gap-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        {isConnecting ? 'Connecting...' : 'Disconnecting...'}
      </Button>
    );
  }

  return (
    <Button 
      variant={publicKey ? "outline" : "default"}
      onClick={handleClick}
      className="relative group flex items-center gap-2"
    >
      <Wallet className="w-4 h-4" />
      {publicKey ? (
        <span>
          {publicKey.toString().slice(0, 4)}...{publicKey.toString().slice(-4)}
        </span>
      ) : (
        'Connect Phantom'
      )}
    </Button>
  );
};

export default WalletButton;
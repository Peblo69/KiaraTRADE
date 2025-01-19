import { FC } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export const WalletButton: FC = () => {
  const { wallet, connect, disconnect, connecting, connected } = useWallet();

  const handleClick = () => {
    console.log('WalletButton click:', {
      wallet: !!wallet,
      connecting,
      connected,
      phantom: {
        available: !!window.phantom?.solana,
        isPhantom: window.phantom?.solana?.isPhantom
      }
    });

    if (connected) {
      disconnect();
    } else {
      connect().catch((error) => {
        console.error('WalletButton connection error:', {
          error,
          name: error.name,
          message: error.message
        });
      });
    }
  };

  if (!wallet) {
    console.log('No wallet adapter found');
    return (
      <Button variant="outline" onClick={() => window.open('https://phantom.app/', '_blank')}>
        Install Phantom
      </Button>
    );
  }

  return (
    <Button 
      variant={connected ? "outline" : "default"}
      onClick={handleClick}
      disabled={connecting}
    >
      {connecting ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Connecting
        </>
      ) : connected ? (
        'Disconnect'
      ) : (
        'Connect Phantom'
      )}
    </Button>
  );
};

export default WalletButton;
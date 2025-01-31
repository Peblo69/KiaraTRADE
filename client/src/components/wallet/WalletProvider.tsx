import { FC, ReactNode, useEffect } from 'react';
import { ConnectionProvider, WalletProvider as SolanaWalletProvider } from '@solana/wallet-adapter-react';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom';
import { WalletError } from '@solana/wallet-adapter-base';
import { useToast } from "@/hooks/use-toast";
import { clusterApiUrl } from '@solana/web3.js';

interface Props {
  children: ReactNode;
}

// Add Phantom type definitions
declare global {
  interface Window {
    phantom?: {
      solana?: {
        isPhantom?: boolean;
        connect(opts?: { onlyIfTrusted?: boolean }): Promise<{ publicKey: any }>;
        disconnect(): Promise<void>;
        on(event: string, handler: (args: any) => void): void;
        removeListener?(event: string, handler: (args: any) => void): void;
        publicKey: any;
      };
    };
  }
}

export const WalletProvider: FC<Props> = ({ children }) => {
  const { toast } = useToast();
  const endpoint = clusterApiUrl('mainnet-beta');
  const wallets = [new PhantomWalletAdapter()];

  const onError = (error: WalletError) => {
    console.error('[Wallet Error]', error);
    toast({
      variant: "destructive",
      title: "Wallet Error",
      description: error.message || "Failed to connect wallet. Please try again.",
    });
  };

  useEffect(() => {
    const provider = window.phantom?.solana;

    if (provider?.isPhantom) {
      const handleConnect = (publicKey: any) => {
        console.log('Wallet connected:', publicKey.toString());
        toast({
          title: "Wallet Connected",
          description: `Connected to ${publicKey.toString().slice(0, 8)}...`,
        });
      };

      const handleDisconnect = () => {
        console.log('Wallet disconnected');
        toast({
          title: "Wallet Disconnected",
          description: "Successfully disconnected from Phantom wallet",
        });
      };

      provider.on('connect', handleConnect);
      provider.on('disconnect', handleDisconnect);

      return () => {
        if (provider.removeListener) {
          provider.removeListener('connect', handleConnect);
          provider.removeListener('disconnect', handleDisconnect);
        }
      };
    }
  }, [toast]);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <SolanaWalletProvider 
        wallets={wallets} 
        onError={onError}
        autoConnect={true}
      >
        {children}
      </SolanaWalletProvider>
    </ConnectionProvider>
  );
};

export default WalletProvider;
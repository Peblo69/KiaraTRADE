// src/components/wallet/WalletProvider.tsx
import { FC, ReactNode, useEffect } from 'react';
import { ConnectionProvider, WalletProvider as SolanaWalletProvider } from '@solana/wallet-adapter-react';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom';
import { WalletError } from '@solana/wallet-adapter-base';
import { useToast } from "@/hooks/use-toast";
import { clusterApiUrl } from '@solana/web3.js';

interface Props {
  children: ReactNode;
}

export const WalletProvider: FC<Props> = ({ children }) => {
  const { toast } = useToast();

  // Use multiple endpoints for redundancy
  const endpoint = clusterApiUrl('mainnet-beta');

  // Initialize wallet adapter
  const wallets = [new PhantomWalletAdapter()];

  const onError = (error: WalletError) => {
    console.error('[Wallet Error]', error);
    toast({
      variant: "destructive",
      title: "Wallet Error",
      description: error.message || "Failed to connect wallet. Please try again.",
    });
  };

  // Add proper Phantom provider detection
  useEffect(() => {
    const provider = window.phantom?.solana;

    if (provider?.isPhantom) {
      provider.on('connect', (publicKey: any) => {
        console.log('Wallet connected:', publicKey.toString());
        toast({
          title: "Wallet Connected",
          description: `Connected to ${publicKey.toString().slice(0, 8)}...`,
        });
      });

      provider.on('disconnect', () => {
        console.log('Wallet disconnected');
        toast({
          title: "Wallet Disconnected",
          description: "Successfully disconnected from Phantom wallet",
        });
      });

      // Cleanup event listeners
      return () => {
        provider.removeAllListeners('connect');
        provider.removeAllListeners('disconnect');
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

// Add Phantom type definitions
declare global {
  interface Window {
    phantom?: {
      solana?: {
        isPhantom?: boolean;
        connect(opts?: { onlyIfTrusted?: boolean }): Promise<{ publicKey: any }>;
        disconnect(): Promise<void>;
        on(event: string, handler: (args: any) => void): void;
        removeAllListeners(event: string): void;
        publicKey: any;
      };
    };
  }
}

export default WalletProvider;
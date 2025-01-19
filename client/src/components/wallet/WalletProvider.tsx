import { FC, ReactNode, useEffect, useMemo } from 'react';
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
  const endpoint = clusterApiUrl('devnet');

  // Initialize wallet adapter
  const wallets = useMemo(
    () => [new PhantomWalletAdapter()],
    []
  );

  const onError = (error: WalletError) => {
    console.error('Wallet error:', error);
    toast({
      variant: "destructive",
      title: "Wallet Error",
      description: error.message || "Failed to connect wallet. Please try again.",
    });
  };

  // Add console logging for debugging
  useEffect(() => {
    if (typeof window !== 'undefined') {
      console.log('Checking Phantom availability:', {
        hasPhantom: !!window.phantom,
        hasSolana: !!window.phantom?.solana,
        isPhantom: !!window.phantom?.solana?.isPhantom,
      });
    }
  }, []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <SolanaWalletProvider 
        wallets={wallets} 
        onError={onError}
        autoConnect={false} // Changed to false to prevent connection issues on load
      >
        {children}
      </SolanaWalletProvider>
    </ConnectionProvider>
  );
};

export default WalletProvider;
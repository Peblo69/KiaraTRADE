import { FC, ReactNode, useEffect, useMemo } from 'react';
import { ConnectionProvider, WalletProvider as SolanaWalletProvider } from '@solana/wallet-adapter-react';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom';
import { WalletError } from '@solana/wallet-adapter-base';
import { useToast } from "@/hooks/use-toast";
import { clusterApiUrl } from '@solana/web3.js';

// Using devnet for development and testing
const SOLANA_NETWORK = clusterApiUrl('devnet');

interface Props {
  children: ReactNode;
}

export const WalletProvider: FC<Props> = ({ children }) => {
  const { toast } = useToast();

  // Initialize wallet adapter
  const wallets = useMemo(
    () => [new PhantomWalletAdapter()],
    []
  );

  const onError = (error: WalletError) => {
    console.error('Wallet error:', error);
    toast({
      title: "Wallet Error",
      description: error.message || "Failed to connect wallet. Please try again.",
      variant: "destructive",
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
    <ConnectionProvider endpoint={SOLANA_NETWORK}>
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
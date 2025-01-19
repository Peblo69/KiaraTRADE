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

  // Add proper Phantom provider detection and event handling
  useEffect(() => {
    const connectEagerly = async () => {
      const provider = window.phantom?.solana;

      if (provider?.isPhantom) {
        try {
          // Only connect if the wallet was previously connected
          const response = await provider.connect({ onlyIfTrusted: true });
          console.log("Eagerly connected to wallet:", response.publicKey.toString());
        } catch (error) {
          // This is expected if the wallet wasn't previously connected
          console.log("Eager connection skipped - wallet not previously connected");
        }
      }
    };

    const setupEventListeners = () => {
      const provider = window.phantom?.solana;

      if (provider?.isPhantom) {
        provider.on('connect', (publicKey: any) => {
          console.log("Phantom connected:", publicKey.toString());
        });

        provider.on('disconnect', () => {
          console.log("Phantom disconnected");
        });

        provider.on('accountChanged', (publicKey: any) => {
          if (publicKey) {
            console.log(`Switched to account: ${publicKey.toString()}`);
          } else {
            console.log("Disconnected from account");
          }
        });

        return () => {
          provider.removeAllListeners();
        };
      }
    };

    // Log initial Phantom availability
    console.log('Initial Phantom state:', {
      hasPhantom: !!window.phantom,
      hasSolana: !!window.phantom?.solana,
      isPhantom: !!window.phantom?.solana?.isPhantom,
      endpoint
    });

    connectEagerly();
    const cleanup = setupEventListeners();

    return () => {
      if (cleanup) cleanup();
    };
  }, []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <SolanaWalletProvider 
        wallets={wallets} 
        onError={onError}
        autoConnect={false} // Manual connection handling for better control
      >
        {children}
      </SolanaWalletProvider>
    </ConnectionProvider>
  );
};

export default WalletProvider;
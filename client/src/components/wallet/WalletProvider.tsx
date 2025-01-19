import { FC, ReactNode, useMemo } from 'react';
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
  const endpoint = useMemo(() => clusterApiUrl('devnet'), []); 

  const wallets = useMemo(
    () => [new PhantomWalletAdapter()],
    []
  );

  const onError = (error: WalletError) => {
    console.error('Wallet error:', {
      error,
      name: error.name,
      message: error.message
    });

    toast({
      variant: "destructive",
      title: "Wallet Error",
      description: error.message || "Failed to connect wallet. Please try again.",
    });
  };

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
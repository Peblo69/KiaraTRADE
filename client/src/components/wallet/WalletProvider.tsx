import { FC, ReactNode, useEffect, useState } from 'react';
import { ConnectionProvider, WalletProvider as SolanaWalletProvider } from '@solana/wallet-adapter-react';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom';
import { WalletError } from '@solana/wallet-adapter-base';
import { useToast } from "@/hooks/use-toast";

// You can change this to mainnet when ready
const SOLANA_NETWORK = "https://api.devnet.solana.com";

interface Props {
  children: ReactNode;
}

export const WalletProvider: FC<Props> = ({ children }) => {
  const [wallets] = useState(() => [new PhantomWalletAdapter()]);
  const { toast } = useToast();

  const onError = (error: WalletError) => {
    toast({
      title: "Wallet Error",
      description: error.message,
      variant: "destructive",
    });
  };

  return (
    <ConnectionProvider endpoint={SOLANA_NETWORK}>
      <SolanaWalletProvider 
        wallets={wallets} 
        onError={onError}
        autoConnect
      >
        {children}
      </SolanaWalletProvider>
    </ConnectionProvider>
  );
};

export default WalletProvider;

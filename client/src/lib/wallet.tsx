import { FC, ReactNode } from 'react';
import { useToast } from "@/hooks/use-toast";

interface WalletContextProviderProps {
  children: ReactNode;
}

export const WalletContextProvider: FC<WalletContextProviderProps> = ({ children }) => {
  const { toast } = useToast();

  const connectWallet = async () => {
    try {
      const provider = window.phantom?.solana;

      if (!provider?.isPhantom) {
        console.error('Phantom wallet not found:', {
          provider: !!provider,
          isPhantom: provider?.isPhantom
        });
        throw new Error("Please install Phantom wallet");
      }

      const resp = await provider.connect();
      console.log('Connected to Phantom:', resp.publicKey.toString());
      return resp.publicKey;
    } catch (error: any) {
      console.error('Wallet connection error:', {
        error,
        message: error.message,
        code: error.code
      });
      toast({
        variant: "destructive",
        title: "Wallet Error",
        description: error.message || "An error occurred connecting to the wallet",
      });
      throw error;
    }
  };

  const disconnectWallet = async () => {
    try {
      const provider = window.phantom?.solana;
      if (provider?.isPhantom) {
        await provider.disconnect();
        console.log('Disconnected from Phantom wallet');
      }
    } catch (error: any) {
      console.error('Wallet disconnect error:', error);
      toast({
        variant: "destructive",
        title: "Wallet Error",
        description: error.message || "An error occurred disconnecting from the wallet",
      });
      throw error;
    }
  };

  return (
    <div>
      {children}
    </div>
  );
};

export default WalletContextProvider;
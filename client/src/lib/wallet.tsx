import { FC, ReactNode, createContext, useContext, useState, useEffect } from 'react';
import { useToast } from "@/hooks/use-toast";
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

interface WalletContextType {
  publicKey: PublicKey | null;
  balance: number;
  tokens: TokenInfo[];
  isConnecting: boolean;
  isDisconnecting: boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
}

interface TokenInfo {
  mint: string;
  symbol: string;
  balance: number;
  decimals: number;
  logo?: string;
}

const WalletContext = createContext<WalletContextType>({
  publicKey: null,
  balance: 0,
  tokens: [],
  isConnecting: false,
  isDisconnecting: false,
  connect: async () => {},
  disconnect: async () => {},
});

export const useWallet = () => useContext(WalletContext);

interface WalletContextProviderProps {
  children: ReactNode;
}

const SOLANA_NETWORK = 'mainnet-beta';
const connection = new Connection(
  `https://api.${SOLANA_NETWORK}.solana.com`,
  'confirmed'
);

export const WalletContextProvider: FC<WalletContextProviderProps> = ({ children }) => {
  const { toast } = useToast();
  const [publicKey, setPublicKey] = useState<PublicKey | null>(null);
  const [balance, setBalance] = useState<number>(0);
  const [tokens, setTokens] = useState<TokenInfo[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  // Fetch balances when wallet is connected
  useEffect(() => {
    if (!publicKey) return;

    const fetchBalances = async () => {
      try {
        // Fetch SOL balance
        const solBalance = await connection.getBalance(publicKey);
        setBalance(solBalance / LAMPORTS_PER_SOL);

        // Fetch token accounts
        const tokenAccounts = await connection.getParsedTokenAccountsByOwner(publicKey, {
          programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
        });

        const tokenInfos: TokenInfo[] = tokenAccounts.value.map(account => {
          const { mint, tokenAmount } = account.account.data.parsed.info;
          return {
            mint,
            symbol: '', // We'll fetch this separately
            balance: tokenAmount.uiAmount,
            decimals: tokenAmount.decimals,
          };
        });

        setTokens(tokenInfos);
      } catch (error: any) {
        console.error('Error fetching balances:', error);
        toast({
          variant: "destructive",
          title: "Balance Error",
          description: error.message || "Failed to fetch wallet balances",
        });
      }
    };

    // Fetch initially and then every 30 seconds
    fetchBalances();
    const interval = setInterval(fetchBalances, 30000);

    return () => clearInterval(interval);
  }, [publicKey, toast]);

  const connect = async () => {
    try {
      setIsConnecting(true);
      const provider = window.phantom?.solana;

      if (!provider?.isPhantom) {
        throw new Error("Please install Phantom wallet");
      }

      const resp = await provider.connect();
      const newPublicKey = new PublicKey(resp.publicKey.toString());
      setPublicKey(newPublicKey);

      toast({
        title: "Wallet Connected",
        description: `Connected to ${newPublicKey.toString().slice(0, 8)}...`,
      });
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
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnect = async () => {
    try {
      setIsDisconnecting(true);
      const provider = window.phantom?.solana;
      if (provider?.isPhantom) {
        await provider.disconnect();
        setPublicKey(null);
        setBalance(0);
        setTokens([]);
        toast({
          title: "Wallet Disconnected",
          description: "Successfully disconnected from Phantom wallet",
        });
      }
    } catch (error: any) {
      console.error('Wallet disconnect error:', error);
      toast({
        variant: "destructive",
        title: "Wallet Error",
        description: error.message || "An error occurred disconnecting from the wallet",
      });
      throw error;
    } finally {
      setIsDisconnecting(false);
    }
  };

  return (
    <WalletContext.Provider
      value={{
        publicKey,
        balance,
        tokens,
        isConnecting,
        isDisconnecting,
        connect,
        disconnect
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};

// Wallet connect button component
export const WalletConnectButton: FC = () => {
  const { publicKey, balance, isConnecting, isDisconnecting, connect, disconnect } = useWallet();

  if (isConnecting || isDisconnecting) {
    return (
      <Button disabled variant="outline" className="gap-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        {isConnecting ? 'Connecting...' : 'Disconnecting...'}
      </Button>
    );
  }

  if (publicKey) {
    return (
      <Button
        variant="outline"
        onClick={disconnect}
        className="font-mono"
      >
        {balance.toFixed(4)} SOL • {publicKey.toString().slice(0, 4)}...{publicKey.toString().slice(-4)}
      </Button>
    );
  }

  return (
    <Button onClick={connect} variant="outline">
      Connect Wallet
    </Button>
  );
};

export default WalletContextProvider;
import { FC, ReactNode, createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useToast } from "@/hooks/use-toast";
import { Connection, PublicKey, LAMPORTS_PER_SOL, clusterApiUrl } from '@solana/web3.js';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { useLocation } from 'wouter';

interface WalletContextType {
  publicKey: PublicKey | null;
  balance: number;
  balanceUsd: number | null;
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
  balanceUsd: null,
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

// More reliable RPC endpoints
const RPC_ENDPOINTS = [
  clusterApiUrl('mainnet-beta'),
  'https://api.mainnet-beta.solana.com',
  'https://solana-mainnet.g.alchemy.com/v2/demo', // Fallback to Alchemy demo
];

// Create connections for each endpoint
const connections = RPC_ENDPOINTS.map(endpoint => new Connection(endpoint, 'confirmed'));

export const WalletContextProvider: FC<WalletContextProviderProps> = ({ children }) => {
  const { toast } = useToast();
  const [publicKey, setPublicKey] = useState<PublicKey | null>(null);
  const [balance, setBalance] = useState<number>(0);
  const [balanceUsd, setBalanceUsd] = useState<number | null>(null);
  const [tokens, setTokens] = useState<TokenInfo[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [currentEndpointIndex, setCurrentEndpointIndex] = useState(0);

  // Fetch SOL price for USD conversion
  const fetchSolPrice = useCallback(async () => {
    try {
      const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd');
      const data = await response.json();
      return data.solana.usd;
    } catch (error) {
      console.error('Error fetching SOL price:', error);
      return null;
    }
  }, []);

  // Enhanced balance fetching with failover and retries
  const fetchBalance = useCallback(async (pubKey: PublicKey) => {
    let lastError;

    for (let i = 0; i < connections.length; i++) {
      try {
        const connection = connections[i];
        const balance = await connection.getBalance(pubKey);
        setCurrentEndpointIndex(i); // Remember working endpoint
        return balance;
      } catch (error) {
        console.error(`Error with RPC endpoint ${i}:`, error);
        lastError = error;
        continue;
      }
    }

    throw lastError;
  }, []);

  // Fetch balances when wallet is connected
  useEffect(() => {
    if (!publicKey) return;

    let isMounted = true;
    const fetchBalances = async () => {
      try {
        // Fetch SOL balance with failover
        const solBalance = await fetchBalance(publicKey);
        if (!isMounted) return;

        const balanceInSol = solBalance / LAMPORTS_PER_SOL;
        setBalance(balanceInSol);

        // Fetch USD price and calculate USD balance
        const solPrice = await fetchSolPrice();
        if (!isMounted) return;

        if (solPrice) {
          setBalanceUsd(balanceInSol * solPrice);
        }

        // Fetch token accounts using current working connection
        const tokenAccounts = await connections[currentEndpointIndex].getParsedTokenAccountsByOwner(
          publicKey,
          {
            programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
          }
        );

        if (!isMounted) return;

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
        if (!isMounted) return;

        toast({
          variant: "destructive",
          title: "Balance Error",
          description: "Failed to fetch wallet balances. Retrying...",
        });

        // Retry after 5 seconds
        setTimeout(fetchBalances, 5000);
      }
    };

    // Fetch initially and then every 30 seconds
    fetchBalances();
    const interval = setInterval(fetchBalances, 30000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [publicKey, toast, fetchBalance, fetchSolPrice, currentEndpointIndex]);

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
        setBalanceUsd(null);
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
        balanceUsd,
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

// Wallet connect button with hover menu
export const WalletConnectButton: FC = () => {
  const { publicKey, balance, balanceUsd, isConnecting, isDisconnecting, connect, disconnect } = useWallet();
  const [, setLocation] = useLocation();

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
      <div className="relative group">
        <Button
          variant="outline"
          onClick={disconnect}
          className="font-mono"
        >
          {balanceUsd ? `$${balanceUsd.toFixed(2)} • ` : ''}{balance.toFixed(4)} SOL • {publicKey.toString().slice(0, 4)}...{publicKey.toString().slice(-4)}
        </Button>

        {/* Hover Menu */}
        <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-popover opacity-0 group-hover:opacity-100 transition-opacity duration-150 ease-in-out pointer-events-none group-hover:pointer-events-auto">
          <div className="rounded-md ring-1 ring-black ring-opacity-5">
            <div className="py-1" role="menu" aria-orientation="vertical">
              <button
                className="block px-4 py-2 text-sm text-foreground hover:bg-accent w-full text-left"
                role="menuitem"
                onClick={() => setLocation('/wallet')}
              >
                View All Tokens
              </button>
              <button
                className="block px-4 py-2 text-sm text-foreground hover:bg-accent w-full text-left"
                role="menuitem"
                onClick={() => window.open('https://explorer.solana.com/address/' + publicKey.toString(), '_blank')}
              >
                View on Explorer
              </button>
              <button
                className="block px-4 py-2 text-sm text-destructive hover:bg-accent w-full text-left"
                role="menuitem"
                onClick={disconnect}
              >
                Disconnect
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Button onClick={connect} variant="outline">
      Connect Wallet
    </Button>
  );
};

export default WalletContextProvider;
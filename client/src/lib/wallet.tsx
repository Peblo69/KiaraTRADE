import { FC, ReactNode, createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useToast } from "@/hooks/use-toast";
import { Connection, PublicKey, LAMPORTS_PER_SOL, clusterApiUrl } from '@solana/web3.js';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { useLocation } from 'wouter';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import CryptoIcon from "@/components/CryptoIcon";

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

const RPC_ENDPOINTS = [
  clusterApiUrl('mainnet-beta'),
  'https://api.mainnet-beta.solana.com',
  'https://solana-mainnet.g.alchemy.com/v2/demo',
];

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

  const fetchBalance = useCallback(async (pubKey: PublicKey) => {
    let lastError;

    for (let i = 0; i < connections.length; i++) {
      try {
        const connection = connections[i];
        const balance = await connection.getBalance(pubKey);
        setCurrentEndpointIndex(i);
        return balance;
      } catch (error) {
        console.error(`Error with RPC endpoint ${i}:`, error);
        lastError = error;
        continue;
      }
    }

    throw lastError;
  }, []);

  useEffect(() => {
    if (!publicKey) return;

    let isMounted = true;
    const fetchBalances = async () => {
      try {
        const solBalance = await fetchBalance(publicKey);
        if (!isMounted) return;

        const balanceInSol = solBalance / LAMPORTS_PER_SOL;
        setBalance(balanceInSol);

        const solPrice = await fetchSolPrice();
        if (!isMounted) return;

        if (solPrice) {
          setBalanceUsd(balanceInSol * solPrice);
        }

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
            symbol: '',
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

        setTimeout(fetchBalances, 5000);
      }
    };

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
      console.error('Wallet connection error:', error);
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

export const WalletConnectButton: FC = () => {
  const { publicKey, balanceUsd, tokens, isConnecting, isDisconnecting, connect, disconnect } = useWallet();
  const [, setLocation] = useLocation();
  const [showTokens, setShowTokens] = useState(false);

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
          className="font-mono transition-colors"
        >
          ${balanceUsd?.toFixed(2) || '0.00'} • {publicKey.toString().slice(0, 4)}...{publicKey.toString().slice(-4)}
        </Button>

        <div className="absolute right-0 mt-1 w-40 bg-background rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-200 ease-in-out pointer-events-none group-hover:pointer-events-auto z-50">
          <div className="py-1 rounded-md ring-1 ring-border">
            <button
              className="block w-full px-3 py-2 text-sm text-left hover:bg-accent hover:text-accent-foreground transition-colors"
              onClick={() => setShowTokens(true)}
            >
              Tokens
            </button>
            <button
              className="block w-full px-3 py-2 text-sm text-left text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors"
              onClick={disconnect}
            >
              Logout
            </button>
          </div>
        </div>

        <Sheet open={showTokens} onOpenChange={setShowTokens}>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Your Tokens</SheetTitle>
              <SheetDescription>
                Connected to Phantom • {publicKey.toString().slice(0, 4)}...{publicKey.toString().slice(-4)}
              </SheetDescription>
            </SheetHeader>

            <div className="mt-6">
              <ScrollArea className="h-[calc(100vh-180px)]">
                <div className="space-y-2">
                  {tokens.map((token) => (
                    <Card 
                      key={token.mint} 
                      className="p-4 cursor-pointer hover:bg-accent transition-colors"
                      onClick={() => {
                        setShowTokens(false);
                        setLocation(`/project/${token.mint}`);
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <CryptoIcon 
                          symbol={token.mint} 
                          size="sm" 
                          isSolanaAddress={true}
                        />
                        <div>
                          <div className="font-mono text-sm text-muted-foreground">
                            {token.mint.slice(0, 4)}...{token.mint.slice(-4)}
                          </div>
                          <div className="font-mono">
                            {token.balance.toFixed(token.decimals)} {token.symbol || 'tokens'}
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    );
  }

  return (
    <Button onClick={connect} variant="outline">
      Connect Wallet
    </Button>
  );
};
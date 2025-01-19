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

// Debug helper with more detailed logging
const debug = {
  log: (...args: any[]) => {
    console.log('[Wallet]', ...args);
  },
  error: (...args: any[]) => {
    console.error('[Wallet Error]', ...args);
  },
  price: (...args: any[]) => {
    console.log('[Wallet Price]', ...args);
  }
};

// Updated RPC endpoints with more reliable public nodes
const RPC_ENDPOINTS = [
  {
    url: 'https://api.mainnet-beta.solana.com',
    weight: 1
  },
  {
    url: 'https://solana-api.projectserum.com',
    weight: 2
  },
  {
    url: 'https://rpc.ankr.com/solana',
    weight: 3
  },
  {
    url: clusterApiUrl('mainnet-beta'),
    weight: 4
  }
].sort((a, b) => a.weight - b.weight).map(endpoint => endpoint.url);

// Create connections with specific configurations
const connections = RPC_ENDPOINTS.map(endpoint => {
  debug.log('Initializing connection to:', endpoint);
  return new Connection(endpoint, {
    commitment: 'confirmed',
    confirmTransactionInitialTimeout: 60000,
    disableRetryOnRateLimit: false,
    wsEndpoint: endpoint.replace('http', 'ws')
  });
});

const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');

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
      debug.price('Fetching SOL price from CoinGecko');
      const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd', {
        headers: {
          'Accept': 'application/json',
        }
      });

      if (!response.ok) {
        debug.error('Price fetch failed:', response.status);
        return null;
      }

      const data = await response.json();
      if (!data?.solana?.usd) {
        debug.error('Invalid price data format:', data);
        return null;
      }

      debug.price('SOL price:', data.solana.usd);
      return data.solana.usd;
    } catch (error) {
      debug.error('Error fetching SOL price:', error);
      return null;
    }
  }, []);

  const fetchTokenAccounts = useCallback(async (pubKey: PublicKey) => {
    try {
      debug.log('Fetching token accounts for:', pubKey.toString());
      const tokenAccounts = await connections[currentEndpointIndex].getParsedTokenAccountsByOwner(
        pubKey,
        { programId: TOKEN_PROGRAM_ID },
        'confirmed'
      );

      debug.log('Raw token accounts:', tokenAccounts);

      const tokenInfos: TokenInfo[] = tokenAccounts.value
        .filter(account => {
          const tokenAmount = account.account.data.parsed.info.tokenAmount;
          return tokenAmount.uiAmount > 0;
        })
        .map(account => {
          const { mint, tokenAmount } = account.account.data.parsed.info;
          return {
            mint,
            symbol: '',
            balance: tokenAmount.uiAmount,
            decimals: tokenAmount.decimals,
          };
        });

      debug.log('Processed token accounts:', tokenInfos);
      return tokenInfos;
    } catch (error) {
      debug.error('Token account fetch error:', error);
      throw error;
    }
  }, [currentEndpointIndex]);

  const fetchBalance = useCallback(async (pubKey: PublicKey) => {
    let lastError;
    let retryCount = 0;
    const maxRetries = 3;
    const baseDelay = 1000;

    while (retryCount < maxRetries) {
      for (let i = 0; i < connections.length; i++) {
        try {
          debug.log(`Attempting balance fetch from endpoint ${i + 1}/${connections.length}:`, RPC_ENDPOINTS[i]);
          const connection = connections[i];
          const balance = await connection.getBalance(pubKey);
          setCurrentEndpointIndex(i);
          debug.log(`Successfully fetched balance from endpoint ${i + 1}:`, balance);
          return balance;
        } catch (error: any) {
          debug.error(`Error with RPC endpoint ${i}:`, error);
          // Check if it's a 403 error
          if (error.message?.includes('403')) {
            debug.log(`Endpoint ${i + 1} returned 403, trying next endpoint`);
            lastError = error;
            continue;
          }
          lastError = error;
          continue;
        }
      }

      retryCount++;
      if (retryCount < maxRetries) {
        const delay = baseDelay * Math.pow(2, retryCount - 1);
        debug.log(`All endpoints failed. Retry attempt ${retryCount}/${maxRetries} after ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw new Error(`Failed to fetch balance after ${maxRetries} attempts: ${lastError?.message || 'Unknown error'}`);
  }, []);

  useEffect(() => {
    if (!publicKey) return;

    let isMounted = true;
    const fetchBalances = async () => {
      try {
        debug.log('Starting balance fetch for address:', publicKey.toString());
        const solBalance = await fetchBalance(publicKey);
        if (!isMounted) return;

        const balanceInSol = solBalance / LAMPORTS_PER_SOL;
        debug.log('SOL balance:', balanceInSol);
        setBalance(balanceInSol);

        // Fetch price and calculate USD value
        const solPrice = await fetchSolPrice();
        if (!isMounted) return;

        if (solPrice !== null) {
          const usdBalance = balanceInSol * solPrice;
          debug.price('Calculated USD balance:', usdBalance);
          setBalanceUsd(usdBalance);
        } else {
          debug.error('Failed to calculate USD balance - no price available');
          setBalanceUsd(null);
        }

        // Fetch token accounts with retries
        try {
          const tokenInfos = await fetchTokenAccounts(publicKey);
          if (!isMounted) return;
          setTokens(tokenInfos);
        } catch (tokenError) {
          debug.error('Error fetching token accounts:', tokenError);
          toast({
            variant: "destructive",
            title: "Token Error",
            description: "Unable to fetch token balances. Only SOL balance will be displayed.",
          });
        }
      } catch (error: any) {
        debug.error('Error in fetchBalances:', error);
        if (!isMounted) return;

        toast({
          variant: "destructive",
          title: "Balance Error",
          description: `Failed to fetch wallet balances: ${error.message}`,
        });

        // Reset states on error
        setBalance(0);
        setBalanceUsd(null);
        setTokens([]);
      }
    };

    debug.log('Setting up balance fetching interval');
    fetchBalances();
    const interval = setInterval(fetchBalances, 30000);

    return () => {
      debug.log('Cleaning up wallet effect');
      isMounted = false;
      clearInterval(interval);
    };
  }, [publicKey, toast, fetchBalance, fetchSolPrice, fetchTokenAccounts]);

  const connect = async () => {
    try {
      setIsConnecting(true);
      debug.log('Initializing wallet connection...');
      const provider = window.phantom?.solana;

      if (!provider?.isPhantom) {
        debug.error('Phantom wallet not found');
        throw new Error("Please install Phantom wallet");
      }

      debug.log('Connecting to Phantom wallet...');
      const resp = await provider.connect();
      debug.log('Wallet connected:', resp);
      const newPublicKey = new PublicKey(resp.publicKey.toString());
      setPublicKey(newPublicKey);

      toast({
        title: "Wallet Connected",
        description: `Connected to ${newPublicKey.toString().slice(0, 8)}...`,
      });
    } catch (error: any) {
      debug.error('Wallet connection error:', error);
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
      debug.log('Disconnecting wallet...');
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
        debug.log('Wallet disconnected successfully');
      }
    } catch (error: any) {
      debug.error('Wallet disconnect error:', error);
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

            <ScrollArea className="h-[calc(100vh-180px)] mt-6">
              <div className="space-y-2 pr-4">
                <Card className="p-4">
                  <div className="flex items-center gap-2">
                    <CryptoIcon symbol="SOL" size="sm" />
                    <div>
                      <div className="font-mono text-sm">
                        SOL
                      </div>
                      <div className="font-mono">
                        ${balanceUsd?.toFixed(2) || '0.00'}
                      </div>
                    </div>
                  </div>
                </Card>
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
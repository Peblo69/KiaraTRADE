import { create } from 'zustand';
import { queryClient } from './queryClient';
import { createClient } from 'graphql-ws';

export interface Token {
  name: string;
  symbol: string;
  price: number;
  marketCap: number;
  volume24h: number;
  holders: number;
  createdAt: Date;
  address: string;
  imageUrl?: string;
}

interface TokenStore {
  tokens: Token[];
  isConnected: boolean;
  addToken: (token: Token) => void;
  updateToken: (address: string, updates: Partial<Token>) => void;
  setConnected: (connected: boolean) => void;
}

export const useTokenStore = create<TokenStore>((set) => ({
  tokens: [],
  isConnected: false,
  addToken: (token) =>
    set((state) => ({
      tokens: [token, ...state.tokens].slice(0, 100), // Keep last 100 tokens
    })),
  updateToken: (address, updates) =>
    set((state) => ({
      tokens: state.tokens.map((token) =>
        token.address === address ? { ...token, ...updates } : token
      ),
    })),
  setConnected: (connected) => set({ isConnected: connected }),
}));

// BitQuery WebSocket client setup
const client = createClient({
  url: 'wss://streaming.bitquery.io/eap',
  connectionParams: {
    headers: {
      'X-API-KEY': import.meta.env.VITE_BITQUERY_API_KEY,
    },
  },
  on: {
    connected: () => {
      console.log('[BitQuery] WebSocket connected successfully');
      useTokenStore.getState().setConnected(true);
      (window as any).debugConsole?.success('WebSocket connection established');
    },
    error: (error: Error) => {
      console.error('[BitQuery] WebSocket error:', error?.message || 'Unknown error');
      useTokenStore.getState().setConnected(false);
      (window as any).debugConsole?.error(`WebSocket error: ${error?.message || 'Unknown error'}`);
    },
    closed: () => {
      console.log('[BitQuery] WebSocket disconnected');
      useTokenStore.getState().setConnected(false);
      setTimeout(subscribeToTokens, 5000); // Attempt to reconnect after 5 seconds
    },
  },
});

// Subscribe to new PumpFun token trades
function subscribeToTokens() {
  const store = useTokenStore.getState();

  client.subscribe(
    {
      query: `
        subscription {
          Solana {
            DEXTrades(
              where: {
                Trade: { 
                  Dex: { ProtocolName: { is: "pump" } }
                },
                Transaction: { Result: { Success: true } }
              }
            ) {
              Trade {
                Buy {
                  Currency {
                    Name
                    Symbol
                    MintAddress
                    Decimals
                    Fungible
                    Uri
                  }
                  Price
                  PriceInUSD
                }
                Dex {
                  ProtocolName
                  ProtocolFamily
                }
              }
              Transaction {
                Signature
              }
              Block {
                Time
              }
            }
          }
        }
      `,
    },
    {
      next: (data) => {
        if (!data?.data?.Solana?.DEXTrades?.[0]) return;

        const trade = data.data.Solana.DEXTrades[0];
        const token = {
          name: trade.Trade.Buy.Currency.Name || `Pump Token ${trade.Transaction.Signature.slice(0, 8)}`,
          symbol: trade.Trade.Buy.Currency.Symbol || `PUMP${trade.Transaction.Signature.slice(0, 4)}`,
          price: trade.Trade.Buy.PriceInUSD || 0,
          marketCap: trade.Trade.Buy.PriceInUSD * 1_000_000_000, // All pump tokens have 1B supply
          volume24h: 0, // Will be updated in subsequent trades
          holders: 0,
          createdAt: new Date(trade.Block.Time),
          address: trade.Trade.Buy.Currency.MintAddress,
          imageUrl: trade.Trade.Buy.Currency.Uri || "https://via.placeholder.com/40",
        };

        store.addToken(token);
        console.log('[BitQuery] New token detected:', token.name);
      },
      error: (error) => {
        console.error('[BitQuery] Subscription error:', error);
      },
      complete: () => {
        console.log('[BitQuery] Subscription completed');
      },
    },
  );
}

// Initialize WebSocket connection when in browser
if (typeof window !== 'undefined') {
  subscribeToTokens();
}

// Function to fetch initial token data
export async function fetchRealTimeTokens(): Promise<Token[]> {
  try {
    const response = await fetch('https://graphql.bitquery.io', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': import.meta.env.VITE_BITQUERY_API_KEY,
      },
      body: JSON.stringify({
        query: `
          query {
            Solana {
              DEXTrades(
                limit: { count: 10 }
                where: {
                  Trade: { 
                    Dex: { ProtocolName: { is: "pump" } }
                  },
                  Transaction: { Result: { Success: true } }
                }
                orderBy: { descending: Block_Time }
              ) {
                Trade {
                  Buy {
                    Currency {
                      Name
                      Symbol
                      MintAddress
                      Uri
                    }
                    Price
                    PriceInUSD
                  }
                }
                Transaction {
                  Signature
                }
                Block {
                  Time
                }
              }
            }
          }
        `
      }),
    });

    const result = await response.json();
    const tokens = result.data?.Solana?.DEXTrades?.map((trade: any) => ({
      name: trade.Trade.Buy.Currency.Name || `Pump Token ${trade.Transaction.Signature.slice(0, 8)}`,
      symbol: trade.Trade.Buy.Currency.Symbol || `PUMP${trade.Transaction.Signature.slice(0, 4)}`,
      price: trade.Trade.Buy.PriceInUSD || 0,
      marketCap: trade.Trade.Buy.PriceInUSD * 1_000_000_000,
      volume24h: 0,
      holders: 0,
      createdAt: new Date(trade.Block.Time),
      address: trade.Trade.Buy.Currency.MintAddress,
      imageUrl: trade.Trade.Buy.Currency.Uri || "https://via.placeholder.com/40",
    })) || [];

    return tokens;
  } catch (error) {
    console.error('[BitQuery] Error fetching tokens:', error);
    return [];
  }
}

// Pre-fetch tokens and add to store
queryClient.prefetchQuery({
  queryKey: ['/api/tokens/recent'],
  queryFn: fetchRealTimeTokens,
});
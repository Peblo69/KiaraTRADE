import { WebSocket } from 'ws';
import { createClient } from 'graphql-ws';

// Bitquery WebSocket endpoint
const BITQUERY_WSS_URL = 'wss://graphql.bitquery.io';

// This subscription tracks newly created PumpFun tokens
const SUBSCRIPTION_QUERY = `
  subscription getNewlyCreatedPumpFunTokens {
    Solana {
      TokenSupplyUpdates(
        where: {
          Instruction: {
            Program: {
              Address: { is: "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P" },
              Method: { is: "create" }
            }
          }
        }
      ) {
        TokenSupplyUpdate {
          Amount
          PostBalance
          Currency {
            MintAddress
            Name
            Symbol
            Uri
            Decimals
            Fungible
            TokenStandard
          }
        }
      }
    }
  }
`;

interface TokenUpdateResponse {
  data: {
    Solana: {
      TokenSupplyUpdates: Array<{
        TokenSupplyUpdate: {
          Amount: number;
          PostBalance: number;
          Currency: {
            MintAddress: string;
            Name: string;
            Symbol: string;
            Uri?: string;
            Decimals: number;
            Fungible: boolean;
            TokenStandard: string;
          };
        };
      }>;
    };
  };
}

export function setupBitqueryWebSocket(handleNewToken: (tokenData: any) => void) {
  if (!process.env.BITQUERY_API_KEY) {
    console.error('BITQUERY_API_KEY is required');
    return;
  }

  console.log('Initializing Bitquery WebSocket connection...');

  const client = createClient({
    url: BITQUERY_WSS_URL,
    webSocketImpl: WebSocket,
    connectionParams: {
      headers: {
        'X-API-KEY': process.env.BITQUERY_API_KEY
      }
    },
    retryAttempts: 5,
    shouldRetry: (errOrCloseEvent) => {
      console.warn('Bitquery connection issue:', errOrCloseEvent);
      return true;
    },
    onNonLazyError: (error) => {
      console.error('Bitquery non-lazy error:', error);
    }
  });

  // Subscribe to newly created tokens
  client.subscribe<TokenUpdateResponse>(
    { query: SUBSCRIPTION_QUERY },
    {
      next: (data) => {
        if (!data?.data?.Solana?.TokenSupplyUpdates) {
          console.log('No token updates in response:', data);
          return;
        }

        data.data.Solana.TokenSupplyUpdates.forEach((item) => {
          const { Amount, PostBalance, Currency } = item.TokenSupplyUpdate;
          const tokenData = {
            address: Currency.MintAddress,
            name: Currency.Name,
            symbol: Currency.Symbol,
            decimals: Currency.Decimals,
            fungible: Currency.Fungible,
            tokenStandard: Currency.TokenStandard,
            initialSupply: PostBalance,
            amount: Amount,
            uri: Currency.Uri,
            // Adding mock data for price, volume, and market cap since they're not in the Bitquery response
            price: Math.random() * 0.1, // Mock SOL price
            volume24h: Math.random() * 1000000, // Mock 24h volume
            marketCap: Math.random() * 10000000 // Mock market cap
          };

          console.log('New PumpFun token detected:', tokenData);
          handleNewToken(tokenData);
        });
      },
      error: (err) => {
        console.error('Bitquery subscription error:', err);
      },
      complete: () => {
        console.log('Bitquery subscription completed');
      }
    }
  );

  return client;
}
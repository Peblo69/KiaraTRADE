import { WebSocket } from 'ws';
import { createClient } from 'graphql-ws';

// Bitquery WebSocket endpoint with authentication
const BITQUERY_WSS_URL = 'wss://streaming.bitquery.io/graphql';

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
  data?: {
    Solana?: {
      TokenSupplyUpdates?: Array<{
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

  console.log('Setting up BitQuery WebSocket connection...');

  const client = createClient({
    url: BITQUERY_WSS_URL,
    webSocketImpl: WebSocket,
    connectionParams: {
      headers: {
        'X-API-KEY': process.env.BITQUERY_API_KEY
      }
    },
    retryAttempts: 3,
    shouldRetry: (errOrCloseEvent) => {
      console.log('Attempting to reconnect to BitQuery...', errOrCloseEvent);
      return true;
    }
  });

  // Subscribe to newly created tokens
  client.subscribe<TokenUpdateResponse>(
    { query: SUBSCRIPTION_QUERY },
    {
      next: (result) => {
        const updates = result?.data?.Solana?.TokenSupplyUpdates;
        if (!updates) {
          console.log('No token updates in response');
          return;
        }

        updates.forEach((item) => {
          const { Amount, PostBalance, Currency } = item.TokenSupplyUpdate;
          const tokenData = {
            address: Currency.MintAddress,
            name: Currency.Name || 'Unknown Token',
            symbol: Currency.Symbol || '???',
            decimals: Currency.Decimals,
            fungible: Currency.Fungible,
            tokenStandard: Currency.TokenStandard,
            initialSupply: PostBalance,
            amount: Amount,
            uri: Currency.Uri,
            // Mock market data for display
            price: Math.random() * 0.1,
            volume24h: Math.random() * 1000000,
            marketCap: Math.random() * 10000000,
            imageUrl: 'https://cryptologos.cc/logos/solana-sol-logo.png?v=024'
          };

          console.log('New PumpFun token detected:', {
            address: tokenData.address,
            name: tokenData.name,
            symbol: tokenData.symbol
          });

          handleNewToken(tokenData);
        });
      },
      error: (err) => {
        console.error('BitQuery subscription error:', err);
      },
      complete: () => {
        console.log('BitQuery subscription completed');
      }
    }
  );

  return client;
}
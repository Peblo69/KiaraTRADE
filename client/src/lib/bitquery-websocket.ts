import { createClient } from 'graphql-ws';
import { useUnifiedTokenStore } from './unified-token-store';

const BITQUERY_WSS_URL = 'wss://graphql.bitquery.io';

// Subscription for new token creation on PumpFun
const NEW_TOKEN_SUBSCRIPTION = `
subscription {
  Solana {
    Instructions(
      where: { Instruction: { Program: { Method: { is: "create" }, Name: { is: "pump" } } } }
    ) {
      Instruction {
        Accounts {
          Address
          IsWritable
          Token {
            Mint
            Owner
            ProgramId
          }
        }
        Program {
          Name
          Method
        }
      }
      Transaction {
        Signature
      }
    }
  }
}
`;

// Query for last 10 trades of a specific token
const LAST_10_TRADES_QUERY = `
query ($mintAddress: String!) {
  Solana {
    DEXTradeByTokens(
      orderBy: { descending: Block_Time }
      limit: { count: 10 }
      where: {
        Trade: {
          Dex: { ProgramAddress: { is: "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P" } }
          Currency: { MintAddress: { is: $mintAddress } }
        }
        Transaction: { Result: { Success: true } }
      }
    ) {
      Block {
        Time
      }
      Trade {
        Currency {
          MintAddress
          Name
          Symbol
        }
        Dex {
          ProtocolName
          ProgramAddress
        }
        Price
        PriceInUSD
      }
      Transaction {
        Signature
      }
    }
  }
}
`;

class BitQueryWebSocket {
  private client: ReturnType<typeof createClient> | null = null;
  private unsubscribe: (() => void) | null = null;

  connect() {
    if (this.client) {
      console.log('[BitQuery] Already connected');
      return;
    }

    console.log('[BitQuery] Connecting to BitQuery...');

    try {
      this.client = createClient({
        url: BITQUERY_WSS_URL,
        connectionParams: {
          headers: {
            'X-API-KEY': import.meta.env.VITE_BITQUERY_API_KEY,
          },
        },
      });

      this.subscribeToNewTokens();
    } catch (error) {
      console.error('[BitQuery] Connection error:', error);
      useUnifiedTokenStore.getState().setError('BitQuery connection failed');
    }
  }

  private subscribeToNewTokens() {
    if (!this.client) return;

    console.log('[BitQuery] Subscribing to new tokens...');

    this.unsubscribe = this.client.subscribe(
      { query: NEW_TOKEN_SUBSCRIPTION },
      {
        next: (data: any) => {
          const instructions = data?.data?.Solana?.Instructions || [];
          instructions.forEach((instruction: any) => {
            const token = instruction.Instruction.Accounts.find((acc: any) => acc.Token?.Mint);
            if (token) {
              this.handleNewToken(token.Token);
            }
          });
        },
        error: (err) => {
          console.error('[BitQuery] Subscription error:', err);
          useUnifiedTokenStore.getState().setError('BitQuery subscription error');
        },
        complete: () => {
          console.log('[BitQuery] Subscription completed');
        },
      }
    );
  }

  private async handleNewToken(token: any) {
    try {
      // Fetch last 10 trades for new token
      const response = await fetch('https://graphql.bitquery.io', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-KEY': import.meta.env.VITE_BITQUERY_API_KEY || '',
        },
        body: JSON.stringify({
          query: LAST_10_TRADES_QUERY,
          variables: { mintAddress: token.Mint },
        }),
      });

      const result = await response.json();
      const trades = result?.data?.Solana?.DEXTradeByTokens || [];

      // Add token to store with trade history
      useUnifiedTokenStore.getState().addToken({
        name: token.Name || 'Unknown',
        symbol: token.Symbol || 'UNKNOWN',
        address: token.Mint,
        marketCap: 0,
        marketCapSol: 0,
        liquidityAdded: true,
        holders: 0,
        volume24h: 0,
        price: trades[0]?.Trade?.Price || 0,
        source: 'unified',
        trades: trades.map((trade: any) => ({
          timestamp: new Date(trade.Block.Time).getTime(),
          price: trade.Trade.Price,
          priceUSD: trade.Trade.PriceInUSD,
          signature: trade.Transaction.Signature,
        })),
      });
    } catch (error) {
      console.error('[BitQuery] Error handling new token:', error);
    }
  }

  disconnect() {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }

    if (this.client) {
      // @ts-ignore - close method exists but not in types
      this.client.close();
      this.client = null;
    }

    console.log('[BitQuery] Disconnected');
  }
}

export const bitQueryWebSocket = new BitQueryWebSocket();
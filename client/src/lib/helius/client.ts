import { Connection, PublicKey } from '@solana/web3.js';
import { HELIUS_CONFIG } from './config';
import { HeliusTokenTransaction } from './types';

class HeliusClient {
  private connection: Connection;
  private subscriptions: Map<string, number> = new Map();

  constructor() {
    this.connection = new Connection(HELIUS_CONFIG.WS_URL);
  }

  async getTokenTransactions(tokenAddress: string): Promise<HeliusTokenTransaction[]> {
    const response = await fetch(`${HELIUS_CONFIG.API_URL}/token-transactions`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${HELIUS_CONFIG.API_KEY}`
      },
      body: JSON.stringify({
        tokenAddress,
        type: "ALL",
        limit: 100
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch token transactions: ${response.statusText}`);
    }

    return await response.json();
  }

  async subscribeToTokenTransactions(
    tokenAddress: string, 
    onTransaction: (tx: HeliusTokenTransaction) => void
  ): Promise<number> {
    try {
      const subId = await this.connection.onAccountChange(
        new PublicKey(tokenAddress),
        async (accountInfo) => {
          try {
            // Get latest transaction
            const signatures = await this.connection.getSignaturesForAddress(
              new PublicKey(tokenAddress),
              { limit: 1 }
            );

            if (signatures[0]) {
              const tx = await this.connection.getParsedTransaction(
                signatures[0].signature,
                { maxSupportedTransactionVersion: 0 }
              );

              if (tx) {
                const parsedTx = this.parseTransaction(tx);
                onTransaction(parsedTx);
              }
            }
          } catch (error) {
            console.error('[HeliusClient] Error processing transaction:', error);
          }
        },
        'confirmed'
      );

      this.subscriptions.set(tokenAddress, subId);
      console.log(`[HeliusClient] Subscribed to token ${tokenAddress}`);
      return subId;
    } catch (error) {
      console.error('[HeliusClient] Subscription error:', error);
      throw error;
    }
  }

  private parseTransaction(tx: any): HeliusTokenTransaction {
    // Extract relevant data from transaction
    const tokenTransfer = tx.meta?.innerInstructions?.[0]?.instructions.find(
      (ix: any) => ix.program === 'spl-token'
    );

    return {
      signature: tx.transaction.signatures[0],
      timestamp: tx.blockTime! * 1000,
      type: this.determineTransactionType(tx),
      tokenAmount: parseFloat(tokenTransfer?.parsed?.info?.amount || '0'),
      solAmount: tx.meta?.fee / 1e9,
      fee: tx.meta?.fee,
      feePayer: tx.transaction.message.accountKeys[0].pubkey.toString(),
      accountData: tx.meta?.postBalances.map((post: number, i: number) => ({
        account: tx.transaction.message.accountKeys[i].pubkey.toString(),
        preBalance: tx.meta?.preBalances[i],
        postBalance: post
      }))
    };
  }

  private determineTransactionType(tx: any): 'buy' | 'sell' {
    // Implement logic to determine if it's a buy or sell based on token movement
    const tokenTransfer = tx.meta?.innerInstructions?.[0]?.instructions.find(
      (ix: any) => ix.program === 'spl-token'
    );
    
    if (tokenTransfer?.parsed?.info?.authority === tx.transaction.message.accountKeys[0].pubkey.toString()) {
      return 'sell';
    }
    return 'buy';
  }

  unsubscribe(tokenAddress: string) {
    const subId = this.subscriptions.get(tokenAddress);
    if (subId) {
      this.connection.removeAccountChangeListener(subId);
      this.subscriptions.delete(tokenAddress);
      console.log(`[HeliusClient] Unsubscribed from token ${tokenAddress}`);
    }
  }
}

export const heliusClient = new HeliusClient();

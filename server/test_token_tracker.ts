import axios from 'axios';
import { format } from 'date-fns';
import { Connection, PublicKey } from '@solana/web3.js';
import dotenv from 'dotenv';

dotenv.config();

const HELIUS_API_KEY = process.env.HELIUS_API_KEY;
if (!HELIUS_API_KEY) {
    throw new Error("HELIUS_API_KEY must be set in environment variables");
}

const RPC_URL = `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;

interface TokenTrade {
    time: number;
    price: number;
    volume: number;
    type: 'buy' | 'sell';
}

class PumpFunTokenTracker {
    private connection: Connection;
    private trades: TokenTrade[] = [];
    private lastPrice: number = 0;
    private tokenMint: string;
    private isMonitoring: boolean = false;

    constructor(tokenMint: string) {
        this.connection = new Connection(RPC_URL);
        this.tokenMint = tokenMint;
        console.log(`[PumpFunTracker] Initialized for token: ${tokenMint}`);
    }

    async trackTransactions() {
        try {
            console.log('[PumpFunTracker] Fetching recent transactions...');

            const response = await axios.post(RPC_URL, {
                jsonrpc: '2.0',
                id: 'my-id',
                method: 'getSignaturesForAddress',
                params: [
                    this.tokenMint,
                    {
                        limit: 100,
                        commitment: 'confirmed'
                    }
                ]
            });

            if (!response.data?.result) {
                console.warn('[PumpFunTracker] No transactions found');
                return null;
            }

            // Process each transaction
            for (const tx of response.data.result) {
                const txData = await this.getTransactionData(tx.signature);
                if (txData) {
                    this.trades.push(txData);
                    console.log(`[PumpFunTracker] New trade: ${txData.type.toUpperCase()} - ${txData.volume.toFixed(2)} tokens at ${txData.price.toFixed(9)} SOL`);
                }
            }

            // Calculate real-time price
            this.calculateCurrentPrice();

            return {
                currentPrice: this.lastPrice,
                recentTrades: this.trades.slice(-10),
                volumeLast24h: this.calculateVolume24h()
            };

        } catch (error) {
            console.error('[PumpFunTracker] Error tracking transactions:', error);
            return null;
        }
    }

    private async getTransactionData(signature: string): Promise<TokenTrade | null> {
        try {
            const response = await axios.post(RPC_URL, {
                jsonrpc: '2.0',
                id: 'my-id',
                method: 'getTransaction',
                params: [
                    signature,
                    { maxSupportedTransactionVersion: 0 }
                ]
            });

            const tx = response.data.result;
            if (!tx?.meta?.preTokenBalances || !tx?.meta?.postTokenBalances) {
                return null;
            }

            const preBalances = tx.meta.preTokenBalances;
            const postBalances = tx.meta.postTokenBalances;
            const solChange = tx.meta.postBalances[0] - tx.meta.preBalances[0];
            const tokenChange = this.calculateTokenChange(preBalances, postBalances);

            if (tokenChange === 0) return null;

            const price = Math.abs(solChange / tokenChange);
            const volume = Math.abs(tokenChange);
            const type = tokenChange > 0 ? 'buy' : 'sell';

            return {
                time: tx.blockTime * 1000,
                price,
                volume,
                type
            };

        } catch (error) {
            console.error('[PumpFunTracker] Error getting transaction data:', error);
            return null;
        }
    }

    private calculateTokenChange(pre: any[], post: any[]): number {
        const preAmount = pre.find((b: any) => b.mint === this.tokenMint)?.uiTokenAmount?.uiAmount || 0;
        const postAmount = post.find((b: any) => b.mint === this.tokenMint)?.uiTokenAmount?.uiAmount || 0;
        return postAmount - preAmount;
    }

    private calculateCurrentPrice(): number {
        if (this.trades.length === 0) return 0;

        const recentTrades = this.trades.slice(-5);
        const totalVolume = recentTrades.reduce((sum, trade) => sum + trade.volume, 0);
        const weightedPrice = recentTrades.reduce((sum, trade) => 
            sum + (trade.price * (trade.volume / totalVolume)), 0);

        this.lastPrice = weightedPrice;
        return weightedPrice;
    }

    private calculateVolume24h(): number {
        const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
        return this.trades
            .filter(trade => trade.time >= oneDayAgo)
            .reduce((sum, trade) => sum + trade.volume, 0);
    }

    async startLiveMonitoring(updateCallback: (data: any) => void) {
        if (this.isMonitoring) {
            console.warn('[PumpFunTracker] Already monitoring');
            return;
        }

        this.isMonitoring = true;
        console.log('[PumpFunTracker] Starting live monitoring...');

        // Initial data fetch
        await this.trackTransactions();

        try {
            const tokenAccount = new PublicKey(this.tokenMint);
            this.connection.onAccountChange(
                tokenAccount,
                async () => {
                    if (!this.isMonitoring) return;

                    await this.trackTransactions();
                    const data = {
                        price: this.lastPrice,
                        recentTrades: this.trades.slice(-10),
                        volume24h: this.calculateVolume24h(),
                        timestamp: Date.now()
                    };
                    updateCallback(data);
                },
                'confirmed'
            );

            // Keep alive
            process.on('SIGINT', () => {
                console.log('\n[PumpFunTracker] Shutting down...');
                this.isMonitoring = false;
                process.exit(0);
            });

        } catch (error) {
            console.error('[PumpFunTracker] Error in live monitoring:', error);
            this.isMonitoring = false;
        }
    }
}

// Test the tracker with a token
async function main() {
    // Use a recent active token
    const tokenMint = '87asvmcpuXLVgUMVKvcskmZ6pgq3hK8QsQKBncApump'; // Recent active token
    console.log(`[Test] Starting token tracker for ${tokenMint}`);

    const tracker = new PumpFunTokenTracker(tokenMint);
    tracker.startLiveMonitoring((data) => {
        console.log('\n=== Token Update ===');
        console.log(`Time: ${format(data.timestamp, 'yyyy-MM-dd HH:mm:ss')}`);
        console.log(`Current Price: ${data.price.toFixed(9)} SOL`);
        console.log(`24h Volume: ${data.volume24h.toFixed(2)} tokens`);
        console.log('\nRecent Trades:');
        data.recentTrades.forEach((trade: TokenTrade) => {
            const emoji = trade.type === 'buy' ? '🟢' : '🔴';
            console.log(`${emoji} ${format(trade.time, 'HH:mm:ss')} - ${trade.price.toFixed(9)} SOL (${trade.volume.toFixed(2)} tokens)`);
        });
    });
}

main().catch(error => {
    console.error('[Test] Fatal error:', error);
    process.exit(1);
});
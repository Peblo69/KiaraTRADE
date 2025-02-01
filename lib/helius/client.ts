import { Connection, PublicKey } from '@solana/web3.js';
import { HELIUS_CONFIG } from './config';
import { TokenData, TokenStats, TokenTrade } from './types';
import { wsManager } from '../services/websocket';

class HeliusClient {
    private connection: Connection;
    private subscriptions: Map<string, number> = new Map();
    private tokenData: Map<string, TokenData> = new Map();

    constructor() {
        this.connection = new Connection(HELIUS_CONFIG.WS_URL);
        this.setupWebSocketHandlers();
    }

    private setupWebSocketHandlers() {
        wsManager.on('connected', (id) => {
            console.log(`[Helius] WebSocket connected for ${id}`);
        });

        wsManager.on('disconnected', (id) => {
            console.log(`[Helius] WebSocket disconnected for ${id}`);
        });

        wsManager.on('error', ({ id, error }) => {
            console.error(`[Helius] WebSocket error for ${id}:`, error);
        });
    }

    async getTokenData(mint: string) {
        try {
            // 1. Get Real-Time Market Data
            const marketData = await fetch(
                `${HELIUS_CONFIG.REST_URL}/token-metrics/${mint}?api-key=${HELIUS_CONFIG.API_KEY}`
            ).then(res => res.json());

            // 2. Get Recent Trades
            const trades = await fetch(
                `${HELIUS_CONFIG.REST_URL}/token-transactions/${mint}?api-key=${HELIUS_CONFIG.API_KEY}`
            ).then(res => res.json());

            // 3. Pack everything together
            return {
                price: marketData.price,
                priceUSD: marketData.priceUSD,
                volume24h: marketData.volume24h,
                marketCap: marketData.marketCap,
                recentTrades: trades.slice(0, 30), // Last 30 trades
                lastUpdate: Date.now()
            };
        } catch (error) {
            console.error('Failed to fetch token data:', error);
            throw error;
        }
    }

    async subscribeToToken(mint: string) {
        try {
            console.log('[Helius] Starting subscription for:', mint);

            // Get initial data
            const initialData = await this.getTokenData(mint);
            this.tokenData.set(mint, {
                mint,
                stats: initialData,
                trades: initialData.recentTrades,
                recentTrades: initialData.recentTrades,
                priceHistory: []
            });

            // Send first update
            this.broadcastUpdate(mint);

            // Subscribe to account changes
            const subId = await this.connection.onAccountChange(
                new PublicKey(mint),
                async () => {
                    const updatedData = await this.getTokenData(mint);
                    const tokenData = this.tokenData.get(mint);
                    if (tokenData) {
                        tokenData.stats = updatedData;
                        tokenData.recentTrades = updatedData.recentTrades;
                        this.broadcastUpdate(mint);
                    }
                },
                'processed'
            );

            this.subscriptions.set(mint, subId);
            return subId;

        } catch (error) {
            console.error('[Helius] Subscription error:', error);
            throw error;
        }
    }

    private broadcastUpdate(mint: string) {
        const data = this.tokenData.get(mint);
        if (data) {
            wsManager.broadcast({
                type: 'heliusUpdate',
                data: {
                    mint,
                    ...data
                }
            });
        }
    }

    unsubscribe(mint: string) {
        const subId = this.subscriptions.get(mint);
        if (subId) {
            this.connection.removeAccountChangeListener(subId);
            this.subscriptions.delete(mint);
            this.tokenData.delete(mint);
            wsManager.disconnect(`helius-${mint}`);
        }
    }
}

export const heliusClient = new HeliusClient();
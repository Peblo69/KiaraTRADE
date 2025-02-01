import { Connection, PublicKey } from '@solana/web3.js';
import { HELIUS_CONFIG } from './config';
import { TokenData, TokenStats, TokenTrade } from './types';
import { wsManager } from '../services/websocket';

class HeliusClient {
    private connection: Connection;
    private subscriptions: Map<string, number> = new Map();
    private tokenData: Map<string, TokenData> = new Map();

    constructor() {
        console.log('🌟 [HELIUS] Initializing client with endpoint:', HELIUS_CONFIG.WS_URL.replace(HELIUS_CONFIG.API_KEY, '****'));
        this.connection = new Connection(HELIUS_CONFIG.WS_URL);
        this.setupWebSocketHandlers();
    }

    private setupWebSocketHandlers() {
        wsManager.on('connected', (id) => {
            console.log(`🌟 [HELIUS] WebSocket connected for ${id}`);
        });

        wsManager.on('disconnected', (id) => {
            console.log(`🌟 [HELIUS] WebSocket disconnected for ${id}`);
        });

        wsManager.on('error', ({ id, error }) => {
            console.error(`❌ [HELIUS] WebSocket error for ${id}:`, error);
        });
    }

    async getTokenData(mint: string) {
        console.log('🌟 [HELIUS] Fetching data for:', mint);
        try {
            // 1. Get Real-Time Market Data from Helius
            const marketDataUrl = `${HELIUS_CONFIG.REST_URL}/token-metrics/${mint}?api-key=${HELIUS_CONFIG.API_KEY}`;
            console.log('🌟 [HELIUS] Requesting market data from:', marketDataUrl.replace(HELIUS_CONFIG.API_KEY, '****'));

            const marketData = await fetch(marketDataUrl).then(res => res.json());
            console.log('🌟 [HELIUS] Got market data:', marketData);

            // 2. Get Recent Trades from Helius
            const tradesUrl = `${HELIUS_CONFIG.REST_URL}/token-transactions/${mint}?api-key=${HELIUS_CONFIG.API_KEY}`;
            console.log('🌟 [HELIUS] Requesting trades from:', tradesUrl.replace(HELIUS_CONFIG.API_KEY, '****'));

            const trades = await fetch(tradesUrl).then(res => res.json());
            console.log('🌟 [HELIUS] Got trades:', trades?.length || 0);

            // 3. Pack everything together
            const data = {
                price: marketData.price,
                priceUSD: marketData.priceUSD,
                volume24h: marketData.volume24h,
                marketCap: marketData.marketCap,
                recentTrades: trades.slice(0, 30), // Last 30 trades
                lastUpdate: Date.now()
            };

            console.log('🌟 [HELIUS] Final processed data:', data);
            return data;
        } catch (error) {
            console.error('❌ [HELIUS] Failed to fetch token data:', error);
            throw error;
        }
    }

    async subscribeToToken(mint: string) {
        try {
            console.log('🌟 [HELIUS] Starting subscription for:', mint);

            // Get initial data
            const initialData = await this.getTokenData(mint);
            console.log('🌟 [HELIUS] Got initial data for:', mint);

            this.tokenData.set(mint, {
                mint,
                stats: initialData,
                trades: initialData.recentTrades,
                recentTrades: initialData.recentTrades,
                priceHistory: []
            });

            // Send first update
            this.broadcastUpdate(mint);

            // Subscribe to account changes via Helius WebSocket
            console.log('🌟 [HELIUS] Setting up real-time updates for:', mint);
            const subId = await this.connection.onAccountChange(
                new PublicKey(mint),
                async () => {
                    console.log('🌟 [HELIUS] Account changed for:', mint);
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
            console.log('🌟 [HELIUS] Successfully subscribed to:', mint, 'with ID:', subId);
            return subId;

        } catch (error) {
            console.error('❌ [HELIUS] Subscription error:', error);
            throw error;
        }
    }

    private broadcastUpdate(mint: string) {
        const data = this.tokenData.get(mint);
        if (data) {
            console.log('🌟 [HELIUS] Broadcasting update for:', mint);
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
            console.log('🌟 [HELIUS] Unsubscribing from:', mint);
            this.connection.removeAccountChangeListener(subId);
            this.subscriptions.delete(mint);
            this.tokenData.delete(mint);
            wsManager.disconnect(`helius-${mint}`);
        }
    }
}

export const heliusClient = new HeliusClient();
import { usePumpPortalStore } from './pump-portal-websocket';

const WS_URL = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`;
const RECONNECT_DELAY = 5000;
const MAX_RECONNECT_ATTEMPTS = 5;
const BILLION = 1_000_000_000;

interface WebSocketMessage {
    type: string;
    data: any;
}

export class WebSocketManager {
    private ws: WebSocket | null = null;
    private reconnectAttempts = 0;
    private reconnectTimeout: number | null = null;

    public connect(): void {
        console.log('[WebSocket] Connecting to backend...');

        if (this.ws?.readyState === WebSocket.OPEN) {
            console.log('[WebSocket] Already connected');
            return;
        }

        try {
            this.ws = new WebSocket(WS_URL);
            this.setupEventListeners();
        } catch (error) {
            console.error('[WebSocket] Connection error:', error);
            this.updateConnectionStatus(false);
        }
    }

    private setupEventListeners(): void {
        if (!this.ws) return;

        this.ws.onopen = () => {
            console.log('[WebSocket] Connected to backend');
            this.reconnectAttempts = 0;
            this.updateConnectionStatus(true);
        };

        this.ws.onmessage = (event) => {
            try {
                const message: WebSocketMessage = JSON.parse(event.data);
                console.log('[WebSocket] Received:', message);

                switch (message.type) {
                    case 'newToken':
                        this.handleNewToken(message.data);
                        break;
                    case 'trade':
                        this.handleTrade(message.data);
                        break;
                    case 'marketData':
                        this.handleMarketData(message.data);
                        break;
                    case 'connection_status':
                        this.updateConnectionStatus(message.data.connected);
                        break;
                }
            } catch (error) {
                console.error('[WebSocket] Failed to parse message:', error);
            }
        };

        this.ws.onclose = () => {
            console.log('[WebSocket] Disconnected from backend');
            this.updateConnectionStatus(false);
            this.attemptReconnect();
        };

        this.ws.onerror = (error) => {
            console.error('[WebSocket] Error:', error);
        };
    }

    private handleNewToken(data: any): void {
        const store = usePumpPortalStore.getState();
        store.addToken({
            address: data.mint,
            name: data.name || `Token ${data.mint.slice(0, 8)}`,
            symbol: data.symbol || 'UNKNOWN',
            priceInSol: data.priceInSol || 0,
            priceInUsd: data.priceInUsd || 0,
            marketCapSol: data.marketCapSol || 0,
            recentTrades: [],
            vTokensInBondingCurve: data.vTokensInBondingCurve || BILLION,
            vSolInBondingCurve: data.vSolInBondingCurve || 0,
            volume24h: data.volume24h || 0
        });
    }

    private handleTrade(data: any): void {
        const store = usePumpPortalStore.getState();
        const trade = {
            signature: data.signature,
            mint: data.mint,
            timestamp: data.timestamp,
            txType: data.txType,
            tokenAmount: data.tokenAmount,
            solAmount: data.solAmount,
            traderPublicKey: data.traderPublicKey,
            priceInSol: data.priceInSol,
            priceInUsd: data.priceInUsd,
            counterpartyPublicKey: data.counterpartyPublicKey,
            isDevTrade: false
        };
        store.addTradeToHistory(data.mint, trade);
    }

    private handleMarketData(data: any): void {
        const store = usePumpPortalStore.getState();
        if (data.solPrice) {
            store.setSolPrice(data.solPrice);
        }
        if (data.tokenAddress && data.priceInUsd) {
            store.updateTokenPrice(data.tokenAddress, data.priceInUsd);
        }
    }

    private updateConnectionStatus(connected: boolean): void {
        usePumpPortalStore.getState().setConnected(connected);
    }

    private attemptReconnect(): void {
        if (this.reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
            this.reconnectAttempts++;
            const delay = RECONNECT_DELAY * this.reconnectAttempts;
            console.log(`[WebSocket] Reconnecting in ${delay/1000}s (attempt ${this.reconnectAttempts})`);

            this.reconnectTimeout = window.setTimeout(() => {
                this.connect();
            }, delay);
        }
    }

    public disconnect(): void {
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }

        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }

    public getStatus(): boolean {
        return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
    }
}

export const wsManager = new WebSocketManager();

// Initialize connection when in browser
if (typeof window !== 'undefined') {
    wsManager.connect();
}
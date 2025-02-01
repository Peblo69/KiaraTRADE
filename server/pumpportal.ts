import { WebSocket } from 'ws';
import { log } from './vite';
import { wsManager } from './services/websocket';

const PUMP_PORTAL_WS_URL = 'wss://pumpportal.fun/api/data';
const TOTAL_SUPPLY = 1_000_000_000;
const RECONNECT_DELAY = 5000;

export function initializePumpPortalWebSocket() {
    let ws: WebSocket | null = null;
    let reconnectAttempt = 0;
    const MAX_RECONNECT_ATTEMPTS = 5;

    function connect() {
        try {
            log('[PumpPortal] Connecting to PumpPortal WebSocket...');
            ws = new WebSocket(PUMP_PORTAL_WS_URL);

            ws.onopen = () => {
                log('[PumpPortal] Connected to PumpPortal');
                reconnectAttempt = 0;

                // Subscribe to all events immediately on connection
                if (ws?.readyState === WebSocket.OPEN) {
                    // Subscribe to new token events
                    ws.send(JSON.stringify({
                        method: "subscribeNewToken"
                    }));

                    // Subscribe to token trades
                    ws.send(JSON.stringify({
                        method: "subscribeTokenTrades",
                        keys: [] // Empty array subscribes to all tokens
                    }));

                    // Notify frontend clients of successful connection
                    wsManager.broadcast({
                        type: 'connection_status',
                        data: { connected: true }
                    });
                }
            };

            ws.onmessage = async (event) => {
                try {
                    const data = JSON.parse(event.data.toString());
                    log('[PumpPortal] Received data:', data);

                    if (data.message?.includes('Successfully subscribed')) {
                        log('[PumpPortal] Subscription confirmed:', data.message);
                        return;
                    }

                    // Handle new token creation
                    if (data.txType === 'create' && data.mint) {
                        log('[PumpPortal] New token created:', data.mint);
                        const enrichedData = {
                            ...data,
                            timestamp: Date.now(),
                            priceInSol: data.solAmount ? (data.solAmount / TOTAL_SUPPLY) : 0,
                            isNewToken: true
                        };

                        // Broadcast new token to frontend clients
                        wsManager.broadcast({
                            type: 'newToken',
                            data: enrichedData
                        });

                        // Auto-subscribe to trades for this new token
                        if (ws?.readyState === WebSocket.OPEN) {
                            ws.send(JSON.stringify({
                                method: "subscribeTokenTrade",
                                keys: [data.mint]
                            }));
                        }
                    }
                    // Handle trade events
                    else if (['buy', 'sell'].includes(data.txType) && data.mint) {
                        const tradeData = {
                            ...data,
                            timestamp: Date.now(),
                            priceInSol: data.solAmount / data.tokenAmount,
                            priceInUsd: (data.solAmount / data.tokenAmount) * data.solPrice,
                            volume24h: data.volume24h || 0
                        };

                        // Broadcast trade to frontend clients
                        wsManager.broadcast({
                            type: 'trade',
                            data: tradeData
                        });

                        // Also send market data update
                        wsManager.broadcast({
                            type: 'marketData',
                            data: {
                                tokenAddress: data.mint,
                                priceInSol: tradeData.priceInSol,
                                priceInUsd: tradeData.priceInUsd,
                                volume24h: tradeData.volume24h,
                                marketCapSol: data.marketCapSol || 0,
                                timestamp: Date.now()
                            }
                        });
                    }
                } catch (error) {
                    console.error('[PumpPortal] Failed to process message:', error);
                }
            };

            ws.onclose = () => {
                log('[PumpPortal] Disconnected from PumpPortal');
                wsManager.broadcast({
                    type: 'connection_status',
                    data: { connected: false }
                });

                if (reconnectAttempt < MAX_RECONNECT_ATTEMPTS) {
                    reconnectAttempt++;
                    log(`[PumpPortal] Attempting reconnect ${reconnectAttempt}/${MAX_RECONNECT_ATTEMPTS}`);
                    setTimeout(connect, RECONNECT_DELAY * reconnectAttempt);
                }
            };

            ws.onerror = (error) => {
                console.error('[PumpPortal] WebSocket error:', error);
            };

        } catch (error) {
            console.error('[PumpPortal] Failed to initialize WebSocket:', error);
            if (reconnectAttempt < MAX_RECONNECT_ATTEMPTS) {
                reconnectAttempt++;
                setTimeout(connect, RECONNECT_DELAY);
            }
        }
    }

    // Start initial connection
    connect();

    return () => {
        if (ws) {
            ws.close();
        }
    };
}
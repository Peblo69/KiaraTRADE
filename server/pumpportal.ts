import { WebSocket } from 'ws';
import axios from 'axios';
import { log } from './vite';
import { wsManager } from './services/websocket';

const PUMP_PORTAL_WS_URL = 'wss://pumpportal.fun/api/data';
const TOTAL_SUPPLY = 1_000_000_000;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY = 5000;

let ws: WebSocket | null = null;
let reconnectAttempts = 0;

export const initializePumpPortalWebSocket = () => {
    const connect = () => {
        ws = new WebSocket(PUMP_PORTAL_WS_URL);

        ws.onopen = () => {
            log('[PumpPortal] WebSocket connected');
            reconnectAttempts = 0;

            // Subscribe to new tokens
            ws?.send(JSON.stringify({
                method: "subscribeNewToken",
                keys: []
            }));
        };

        ws.onmessage = async (event) => {
            try {
                const data = JSON.parse(event.data.toString());

                if (data.message?.includes('Successfully subscribed')) {
                    log('[PumpPortal] Subscription confirmed:', data.message);
                    return;
                }

                if (data.errors) {
                    console.error('[PumpPortal] Error received:', data.errors);
                    return;
                }

                // Handle token creation events with complete metadata
                if (data.txType === 'create' && data.mint) {
                    log('[PumpPortal] New token created:', data.mint);

                    // Enrich the token data
                    const enrichedData = {
                        ...data,
                        name: data.name || `Token ${data.mint.slice(0, 8)}`,
                        symbol: data.symbol || data.mint.slice(0, 6),
                        uri: data.uri || null,
                        creators: data.creators || [],
                        initialBuy: data.tokenAmount,
                        priceInSol: data.solAmount / (data.tokenAmount || TOTAL_SUPPLY),
                        marketCapSol: data.vSolInBondingCurve || 0
                    };

                    // Broadcast to all connected clients
                    wsManager.broadcast({ 
                        type: 'newToken',
                        data: enrichedData
                    });

                    // Subscribe to trades for the new token
                    ws?.send(JSON.stringify({
                        method: "subscribeTokenTrade",
                        keys: [data.mint]
                    }));
                }

                // Handle trade events with complete market data
                else if (['buy', 'sell'].includes(data.txType) && data.mint) {
                    // Enrich trade data with market info
                    const tradeData = {
                        ...data,
                        priceInSol: data.solAmount / data.tokenAmount,
                        timestamp: Date.now(),
                        marketCapSol: data.marketCapSol || (data.vSolInBondingCurve || 0)
                    };

                    wsManager.broadcast({ 
                        type: 'trade',
                        data: tradeData
                    });
                }

            } catch (error) {
                console.error('[PumpPortal] Failed to parse message:', error);
            }
        };

        ws.onclose = (event) => {
            log('[PumpPortal] WebSocket disconnected:', event.reason);
            if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
                reconnectAttempts++;
                log(`[PumpPortal] Attempting reconnect ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}`);
                setTimeout(connect, RECONNECT_DELAY * Math.pow(1.5, reconnectAttempts));
            } else {
                console.error('[PumpPortal] Max reconnection attempts reached');
            }
        };

        ws.onerror = (error) => {
            console.error('[PumpPortal] WebSocket error:', error);
            ws?.close();
        };
    };

    connect();
    return ws;
};
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
        try {
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
                    log('[PumpPortal] Received data:', data);

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

                        // Extract proper token name and symbol
                        let tokenName = data.name;
                        let tokenSymbol = data.symbol;

                        // If we don't have proper name/symbol, try to extract from mint
                        if (!tokenName || !tokenSymbol) {
                            // Try to get a more readable name from the mint address
                            const baseName = data.mint.slice(-4);
                            tokenName = `${data.mint.slice(0, 4)}...${baseName}`;
                            tokenSymbol = data.mint.slice(-4).toUpperCase();
                        }

                        // Additional validation
                        tokenName = tokenName || `Token ${data.mint.slice(0, 8)}`;
                        tokenSymbol = tokenSymbol || data.mint.slice(0, 6).toUpperCase();

                        // Enrich the token data
                        const enrichedData = {
                            ...data,
                            name: tokenName,
                            symbol: tokenSymbol,
                            uri: data.uri || null,
                            creators: data.creators || [],
                            initialBuy: data.tokenAmount || 0,
                            priceInSol: data.solAmount ? (data.solAmount / (data.tokenAmount || TOTAL_SUPPLY)) : 0,
                            marketCapSol: data.vSolInBondingCurve || 0,
                            timestamp: Date.now(),
                            isNewToken: true
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
                            priceInSol: data.solAmount ? (data.solAmount / data.tokenAmount) : 0,
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
        } catch (error) {
            console.error('[PumpPortal] Connection error:', error);
            setTimeout(connect, RECONNECT_DELAY);
        }
    };

    connect();
    return ws;
};
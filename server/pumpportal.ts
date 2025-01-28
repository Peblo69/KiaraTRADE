import { WebSocket } from 'ws';
import axios from 'axios';
import { log } from './vite';
import { wsManager } from './services/websocket';

const PUMP_PORTAL_WS_URL = 'wss://pumpportal.fun/api/data';
const TOTAL_SUPPLY = 1_000_000_000;
const RECONNECT_DELAY = 5000;

export function initializePumpPortalWebSocket() {
    const ws = new WebSocket(PUMP_PORTAL_WS_URL);

    ws.onopen = () => {
        log('[PumpPortal] WebSocket connected');

        // Subscribe to new tokens
        ws.send(JSON.stringify({
            method: "subscribeNewToken",
            keys: []
        }));

        // Subscribe to token trades
        ws.send(JSON.stringify({
            method: "subscribeTokenTrades",
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

            // Handle token creation events
            if (data.txType === 'create' && data.mint) {
                log('[PumpPortal] New token created:', data.mint);

                // Immediately fetch metadata when we get the URI
                let imageUrl = null;
                if (data.uri) {
                    try {
                        const metadataResponse = await fetch(data.uri);
                        const metadata = await metadataResponse.json();
                        imageUrl = metadata.image || null;
                        log('[PumpPortal] Found image URL:', imageUrl);
                    } catch (error) {
                        console.error('[PumpPortal] Failed to fetch metadata:', error);
                    }
                }

                const enrichedData = {
                    ...data,
                    name: data.name || `Token ${data.mint.slice(0, 8)}`,
                    symbol: data.symbol || data.mint.slice(0, 6).toUpperCase(),
                    uri: data.uri || '',
                    creators: data.creators || [],
                    initialBuy: data.tokenAmount || 0,
                    priceInSol: data.solAmount ? (data.solAmount / (data.tokenAmount || TOTAL_SUPPLY)) : 0,
                    marketCapSol: data.vSolInBondingCurve || 0,
                    timestamp: Date.now(),
                    isNewToken: true,
                    metadata: {
                        ...data.metadata,
                        imageUrl // Add the image URL directly to metadata
                    }
                };

                log('[PumpPortal] Enriched token data:', JSON.stringify(enrichedData, null, 2));

                // Broadcast initial data with image URL already included
                wsManager.broadcast({ 
                    type: 'newToken',
                    data: enrichedData
                });
            }

            // Handle trade events with market data
            else if (['buy', 'sell'].includes(data.txType) && data.mint) {
                const tradeData = {
                    ...data,
                    priceInSol: data.solAmount ? (data.solAmount / data.tokenAmount) : 0,
                    timestamp: Date.now(),
                    marketCapSol: data.marketCapSol || data.vSolInBondingCurve || 0
                };

                wsManager.broadcast({ 
                    type: 'trade',
                    data: tradeData
                });
            }

        } catch (error) {
            console.error('[PumpPortal] Failed to process message:', error);
        }
    };

    ws.onclose = () => {
        log('[PumpPortal] WebSocket disconnected, attempting reconnect...');
        setTimeout(() => initializePumpPortalWebSocket(), RECONNECT_DELAY);
    };

    ws.onerror = (error) => {
        console.error('[PumpPortal] WebSocket error:', error);
    };

    return ws;
}
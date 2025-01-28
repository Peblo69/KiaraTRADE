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
                log('[PumpPortal] Token URI:', data.uri); // Add URI logging

                // Extract base metadata with enhanced logging
                const baseMetadata = {
                    name: data.name || `Token ${data.mint.slice(0, 8)}`,
                    symbol: data.symbol || data.mint.slice(0, 6).toUpperCase(),
                    uri: data.uri || '', // Ensure URI capture
                    creators: data.creators || [],
                    mint: data.mint,
                    decimals: data.decimals || 9
                };

                log('[PumpPortal] Base Metadata:', baseMetadata);
                log('[PumpPortal] Full token data:', JSON.stringify(data, null, 2));

                // Basic enriched data with URI
                const enrichedData = {
                    ...data,
                    name: baseMetadata.name,
                    symbol: baseMetadata.symbol,
                    uri: baseMetadata.uri,
                    creators: baseMetadata.creators,
                    initialBuy: data.tokenAmount || 0,
                    priceInSol: data.solAmount ? (data.solAmount / (data.tokenAmount || TOTAL_SUPPLY)) : 0,
                    marketCapSol: data.vSolInBondingCurve || 0,
                    timestamp: Date.now(),
                    isNewToken: true,
                    metadata: baseMetadata
                };

                log('[PumpPortal] Enriched token data:', enrichedData);

                // Broadcast initial data
                wsManager.broadcast({ 
                    type: 'newToken',
                    data: enrichedData
                });

                // Subscribe to trades for this token
                ws.send(JSON.stringify({
                    method: "subscribeTokenTrade",
                    keys: [data.mint]
                }));
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
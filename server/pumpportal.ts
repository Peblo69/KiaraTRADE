import { WebSocket } from 'ws';
import { log } from './vite';
import { wsManager } from './services/websocket';

const PUMP_PORTAL_WS_URL = 'wss://pumpportal.fun/api/data';
const TOTAL_SUPPLY = 1_000_000_000;
const RECONNECT_DELAY = 5000;

async function fetchMetadataWithImage(uri: string) {
    try {
        log('[PumpPortal] Attempting to fetch metadata from:', uri);
        const response = await fetch(uri);
        const metadata = await response.json();
        let imageUrl = metadata.image;
        log('[PumpPortal] Found image URL:', imageUrl);

        if (imageUrl?.startsWith('ipfs://')) {
            imageUrl = `https://ipfs.io/ipfs/${imageUrl.slice(7)}`;
            log('[PumpPortal] Processed IPFS URL to:', imageUrl);
        }

        const processedMetadata = {
            ...metadata,
            image: imageUrl
        };
        log('[PumpPortal] Final processed metadata:', processedMetadata);
        return processedMetadata;
    } catch (error) {
        console.error('[PumpPortal] Failed to fetch metadata:', error);
        return null;
    }
}

export function initializePumpPortalWebSocket() {
    let ws: WebSocket | null = null;
    let reconnectAttempt = 0;
    const MAX_RECONNECT_ATTEMPTS = 5;

    function connect() {
        try {
            ws = new WebSocket(PUMP_PORTAL_WS_URL);

            ws.onopen = () => {
                log('[PumpPortal] WebSocket connected');
                reconnectAttempt = 0; // Reset reconnect attempts on successful connection

                // Subscribe to events
                if (ws && ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({
                        method: "subscribeNewToken",
                        keys: []
                    }));

                    ws.send(JSON.stringify({
                        method: "subscribeTokenTrades",
                        keys: []
                    }));
                }

                // Broadcast connection status
                wsManager.broadcast({
                    type: 'connection_status',
                    data: {
                        isConnected: true,
                        currentTime: new Date().toISOString(),
                        currentUser: "Peblo69"
                    }
                });
            };

            ws.onmessage = async (event) => {
                try {
                    const data = JSON.parse(event.data.toString());
                    log('[PumpPortal] Received raw data:', data);

                    if (data.message?.includes('Successfully subscribed')) {
                        log('[PumpPortal] Subscription confirmed:', data.message);
                        return;
                    }

                    if (data.txType === 'create' && data.mint) {
                        log('[PumpPortal] New token created:', data.mint);
                        log('[PumpPortal] Token URI:', data.uri);

                        let tokenMetadata = null;
                        let imageUrl = null;

                        if (data.uri) {
                            try {
                                tokenMetadata = await fetchMetadataWithImage(data.uri);
                                imageUrl = tokenMetadata?.image;
                                log('[PumpPortal] Successfully fetched metadata and image:', { metadata: tokenMetadata, imageUrl });
                            } catch (error) {
                                console.error('[PumpPortal] Error fetching metadata:', error);
                            }
                        }

                        const baseMetadata = {
                            name: data.name || `Token ${data.mint.slice(0, 8)}`,
                            symbol: data.symbol || data.mint.slice(0, 6).toUpperCase(),
                            uri: data.uri || '',
                            creators: data.creators || [],
                            mint: data.mint,
                            decimals: data.decimals || 9,
                            imageUrl: imageUrl
                        };

                        log('[PumpPortal] Base Metadata:', JSON.stringify(baseMetadata, null, 2));

                        const enrichedData = {
                            ...data,
                            name: baseMetadata.name,
                            symbol: baseMetadata.symbol,
                            metadata: baseMetadata,
                            imageUrl: imageUrl,
                            uri: baseMetadata.uri,
                            creators: baseMetadata.creators,
                            initialBuy: data.tokenAmount || 0,
                            priceInSol: data.solAmount ? (data.solAmount / (data.tokenAmount || TOTAL_SUPPLY)) : 0,
                            marketCapSol: data.vSolInBondingCurve || 0,
                            timestamp: Date.now(),
                            isNewToken: true,
                            socials: {
                                twitter: data.twitter || tokenMetadata?.twitter || null,
                                telegram: data.telegram || tokenMetadata?.telegram || null,
                                website: data.website || tokenMetadata?.website || null,
                                pumpfun: `https://pump.fun/coin/${data.mint}`
                            }
                        };

                        log('[PumpPortal] Enriched token data:', JSON.stringify(enrichedData, null, 2));

                        wsManager.broadcast({ 
                            type: 'newToken',
                            data: enrichedData
                        });

                        // Subscribe to trades for the new token
                        if (ws && ws.readyState === WebSocket.OPEN) {
                            ws.send(JSON.stringify({
                                method: "subscribeTokenTrade",
                                keys: [data.mint]
                            }));
                        }
                    }
                    else if (['buy', 'sell'].includes(data.txType) && data.mint) {
                        const tradeData = {
                            ...data,
                            timestamp: Date.now()
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
                log('[PumpPortal] WebSocket disconnected');

                // Broadcast disconnection status
                wsManager.broadcast({
                    type: 'connection_status',
                    data: {
                        isConnected: false,
                        currentTime: new Date().toISOString(),
                        currentUser: "Peblo69"
                    }
                });

                // Attempt reconnection if not max attempts
                if (reconnectAttempt < MAX_RECONNECT_ATTEMPTS) {
                    reconnectAttempt++;
                    log(`[PumpPortal] Attempting reconnect ${reconnectAttempt}/${MAX_RECONNECT_ATTEMPTS}`);
                    setTimeout(connect, RECONNECT_DELAY);
                } else {
                    console.error('[PumpPortal] Max reconnection attempts reached');
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

    // Start the initial connection
    connect();

    return () => {
        if (ws) {
            ws.close();
        }
    };
}
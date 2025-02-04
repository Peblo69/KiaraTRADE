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
    const activeConnections = new Set<WebSocket>();

    function connect() {
        try {
            if (ws) {
                try {
                    ws.terminate(); // Force close any existing connection
                } catch (e) {
                    console.error('[PumpPortal] Error terminating existing connection:', e);
                }
                ws = null;
            }

            // Create new WebSocket with ping/pong enabled
            ws = new WebSocket(PUMP_PORTAL_WS_URL, {
                perMessageDeflate: false
            });

            ws.on('open', () => {
                log('[PumpPortal] WebSocket connected');
                reconnectAttempt = 0;
                activeConnections.add(ws!);

                // Subscribe to events with delay
                setTimeout(() => {
                    if (ws?.readyState === WebSocket.OPEN) {
                        ws.send(JSON.stringify({
                            method: "subscribeNewToken"
                        }));

                        setTimeout(() => {
                            if (ws?.readyState === WebSocket.OPEN) {
                                ws.send(JSON.stringify({
                                    method: "subscribeTokenTrades",
                                    keys: []
                                }));
                            }
                        }, 5000); // 5 second delay between subscriptions
                    }
                }, 2000); // Initial 2 second delay

                // Broadcast connection status
                wsManager.broadcast({
                    type: 'connection_status',
                    data: {
                        isConnected: true,
                        currentTime: new Date().toISOString(),
                        currentUser: "Peblo69"
                    }
                });
            });

            // Handle pings to keep connection alive
            ws.on('ping', () => {
                if (ws?.readyState === WebSocket.OPEN) {
                    ws.pong();
                }
            });

            ws.on('message', async (rawData) => {
                try {
                    if (!ws || ws.readyState !== WebSocket.OPEN) return;

                    const data = JSON.parse(rawData.toString());
                    log('[PumpPortal] Received raw data:', data);

                    if (data.message?.includes('Successfully subscribed')) {
                        log('[PumpPortal] Subscription confirmed:', data.message);
                        return;
                    }

                    if (data.txType === 'create' && data.mint) {
                        log('[PumpPortal] New token created:', data.mint);

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

                        const enrichedData = {
                            ...data,
                            ...baseMetadata,
                            initialBuy: data.tokenAmount || 0,
                            priceInSol: data.solAmount ? (data.solAmount / (data.tokenAmount || TOTAL_SUPPLY)) : 0,
                            marketCapSol: data.vSolInBondingCurve || 0,
                            timestamp: Date.now(),
                            isNewToken: true,
                            twitter: tokenMetadata?.twitter || data.twitter,
                            telegram: tokenMetadata?.telegram || data.telegram,
                            website: tokenMetadata?.website || data.website
                        };

                        wsManager.broadcast({ 
                            type: 'newToken',
                            data: enrichedData
                        });
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
            });

            ws.on('close', (code, reason) => {
                log('[PumpPortal] WebSocket disconnected:', code, reason?.toString());
                activeConnections.delete(ws!);
                ws = null;

                // Broadcast disconnection status
                wsManager.broadcast({
                    type: 'connection_status',
                    data: {
                        isConnected: false,
                        currentTime: new Date().toISOString(),
                        currentUser: "Peblo69"
                    }
                });

                // Only attempt reconnect for unexpected closures
                if (code !== 1000 && reconnectAttempt < MAX_RECONNECT_ATTEMPTS) {
                    reconnectAttempt++;
                    log(`[PumpPortal] Attempting reconnect ${reconnectAttempt}/${MAX_RECONNECT_ATTEMPTS}`);
                    setTimeout(connect, RECONNECT_DELAY * Math.pow(2, reconnectAttempt - 1));
                } else if (reconnectAttempt >= MAX_RECONNECT_ATTEMPTS) {
                    console.error('[PumpPortal] Max reconnection attempts reached');
                }
            });

            ws.on('error', (error) => {
                console.error('[PumpPortal] WebSocket error:', error);

                if (error.message.includes('ECONNREFUSED')) {
                    console.error('[PumpPortal] Connection refused, possible rate limit');
                    reconnectAttempt = MAX_RECONNECT_ATTEMPTS; // Skip further attempts
                }
            });

        } catch (error) {
            console.error('[PumpPortal] Failed to initialize WebSocket:', error);
            if (reconnectAttempt < MAX_RECONNECT_ATTEMPTS) {
                reconnectAttempt++;
                setTimeout(connect, RECONNECT_DELAY * Math.pow(2, reconnectAttempt - 1));
            }
        }
    }

    // Start the initial connection
    connect();

    // Return cleanup function
    return () => {
        if (ws) {
            activeConnections.delete(ws);
            ws.close(1000, 'Cleanup');
            ws = null;
        }
    };
}
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
    const ws = new WebSocket(PUMP_PORTAL_WS_URL);

    ws.onopen = () => {
        log('[PumpPortal] WebSocket connected');

        ws.send(JSON.stringify({
            method: "subscribeNewToken",
            keys: []
        }));

        ws.send(JSON.stringify({
            method: "subscribeTokenTrades",
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
                    imageUrl: imageUrl // Add the image URL directly
                };

                log('[PumpPortal] Base Metadata:', JSON.stringify(baseMetadata, null, 2));

                const enrichedData = {
                    ...data,
                    name: baseMetadata.name,
                    symbol: baseMetadata.symbol,
                    metadata: baseMetadata, // This now includes imageUrl
                    imageUrl: imageUrl, // Add it at the top level too
                    uri: baseMetadata.uri,
                    creators: baseMetadata.creators,
                    initialBuy: data.tokenAmount || 0,
                    priceInSol: data.solAmount ? (data.solAmount / (data.tokenAmount || TOTAL_SUPPLY)) : 0,
                    marketCapSol: data.vSolInBondingCurve || 0,
                    timestamp: Date.now(),
                    isNewToken: true
                };

                log('[PumpPortal] Enriched token data:', JSON.stringify(enrichedData, null, 2));

                wsManager.broadcast({ 
                    type: 'newToken',
                    data: enrichedData
                });

                ws.send(JSON.stringify({
                    method: "subscribeTokenTrade",
                    keys: [data.mint]
                }));
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
        log('[PumpPortal] WebSocket disconnected, attempting reconnect...');
        setTimeout(() => initializePumpPortalWebSocket(), RECONNECT_DELAY);
    };

    ws.onerror = (error) => {
        console.error('[PumpPortal] WebSocket error:', error);
    };

    return ws;
}
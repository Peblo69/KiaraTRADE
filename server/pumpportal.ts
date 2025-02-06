import { WebSocket } from 'ws';
import { wsManager } from './services/websocket';
import { syncTokenData, syncTradeData } from './services/pump-portal-sync';

const PUMP_PORTAL_WS_URL = 'wss://pumpportal.fun/api/data';
const TOTAL_SUPPLY = 1_000_000_000;
const RECONNECT_DELAY = 5000;

async function fetchMetadataWithImage(uri: string) {
    try {
        const response = await fetch(uri);
        const metadata = await response.json();
        let imageUrl = metadata.image;

        if (imageUrl?.startsWith('ipfs://')) {
            imageUrl = `https://ipfs.io/ipfs/${imageUrl.slice(7)}`;
        }

        return {
            ...metadata,
            image: imageUrl,
            socials: {
                twitter: metadata.twitter_url || metadata.twitter || null,
                telegram: metadata.telegram_url || metadata.telegram || null,
                website: metadata.website_url || metadata.website || null,
                twitterFollowers: metadata.twitter_followers || 0,
                telegramMembers: metadata.telegram_members || 0
            }
        };
    } catch {
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
                reconnectAttempt = 0;

                if (ws?.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({
                        method: "subscribeNewToken"
                    }));

                    ws.send(JSON.stringify({
                        method: "subscribeTokenTrades"
                    }));
                }

                wsManager.broadcast({
                    type: 'connection_status',
                    data: { isConnected: true }
                });
            };

            ws.onmessage = async (event) => {
                try {
                    const data = JSON.parse(event.data.toString());

                    if (data.message?.includes('Successfully subscribed')) {
                        return;
                    }

                    if (data.txType === 'create' && data.mint) {
                        let tokenMetadata = null;
                        let imageUrl = null;
                        let socials = {
                            twitter: null,
                            telegram: null,
                            website: null,
                            twitterFollowers: 0,
                            telegramMembers: 0
                        };

                        if (data.uri) {
                            tokenMetadata = await fetchMetadataWithImage(data.uri);
                            imageUrl = tokenMetadata?.image;
                            socials = tokenMetadata?.socials || socials;
                        }

                        const enrichedData = {
                            name: data.name || `Token ${data.mint.slice(0, 8)}`,
                            symbol: data.symbol || data.mint.slice(0, 6).toUpperCase(),
                            address: data.mint,
                            bondingCurveKey: data.bondingCurveKey || "",
                            vTokensInBondingCurve: data.vTokensInBondingCurve || 0,
                            vSolInBondingCurve: data.vSolInBondingCurve || 0,
                            marketCapSol: data.marketCapSol || 0,
                            metadata: {
                                name: data.name || `Token ${data.mint.slice(0, 8)}`,
                                symbol: data.symbol || data.mint.slice(0, 6).toUpperCase(),
                                decimals: data.decimals || 9,
                                mint: data.mint,
                                uri: data.uri || "",
                                imageUrl: imageUrl,
                                creators: data.creators || []
                            },
                            timestamp: Date.now(),
                            website: socials.website || data.website,
                            twitter: socials.twitter || data.twitter,
                            telegram: socials.telegram || data.telegram,
                            socials: {
                                website: socials.website || data.website,
                                twitter: socials.twitter || data.twitter,
                                telegram: socials.telegram || data.telegram,
                                twitterFollowers: socials.twitterFollowers || 0,
                                telegramMembers: socials.telegramMembers || 0
                            },
                            recentTrades: []
                        };

                        await syncTokenData(enrichedData);
                        wsManager.broadcast({ type: 'newToken', data: enrichedData });

                        if (ws?.readyState === WebSocket.OPEN) {
                            ws.send(JSON.stringify({
                                method: "subscribeTokenTrade",
                                keys: [data.mint]
                            }));
                        }
                    } else if (['buy', 'sell'].includes(data.txType) && data.mint) {
                        const tradeData = {
                            ...data,
                            timestamp: Date.now()
                        };

                        await syncTradeData(tradeData);
                        wsManager.broadcast({ type: 'trade', data: tradeData });
                    }
                } catch {}
            };

            ws.onclose = () => {
                wsManager.broadcast({
                    type: 'connection_status',
                    data: { isConnected: false }
                });

                if (reconnectAttempt < MAX_RECONNECT_ATTEMPTS) {
                    reconnectAttempt++;
                    setTimeout(connect, RECONNECT_DELAY);
                }
            };

            ws.onerror = () => {};

        } catch {
            if (reconnectAttempt < MAX_RECONNECT_ATTEMPTS) {
                reconnectAttempt++;
                setTimeout(connect, RECONNECT_DELAY);
            }
        }
    }

    connect();

    return () => {
        if (ws) {
            ws.close();
        }
    };
}
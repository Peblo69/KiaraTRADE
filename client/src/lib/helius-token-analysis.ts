import { useState, useEffect } from 'react';

const HELIUS_WS_URL = process.env.NEXT_PUBLIC_HELIUS_WS_URL;
const RECONNECT_DELAY = 5000;
const MAX_RECONNECT_ATTEMPTS = 5;

interface TokenData {
  marketStats: {
    marketCap: number;
    circulatingSupply: number;
    totalSupply: number;
    maxSupply: number;
    priceChange24h: number;
    volume24h: number;
    liquidity24h: number;
    ath: { price: number; timestamp: number };
    atl: { price: number; timestamp: number };
  };
  socialMetrics: {
    communityScore: number;
    socialVolume: number;
    sentiment: 'bullish' | 'bearish' | 'neutral';
    trendingTopics: string[];
  };
  realtime: {
    currentPrice: number;
    lastTrade: null | {
      price: number;
      size: number;
      side: 'buy' | 'sell';
    };
    bidAskSpread: number;
  };
}

export function useTokenAnalysis(tokenAddress: string) {
  const [data, setData] = useState<TokenData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tokenAddress || !HELIUS_WS_URL) return;

    let ws: WebSocket | null = null;
    let reconnectAttempts = 0;
    let reconnectTimeout: NodeJS.Timeout | null = null;

    const connect = () => {
      try {
        ws = new WebSocket(`${HELIUS_WS_URL}/token/${tokenAddress}`);

        ws.onopen = () => {
          console.log('[Helius] Connected');
          setIsLoading(false);
          reconnectAttempts = 0;

          // Subscribe to token data
          ws?.send(JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'subscribeToken',
            params: {
              token: tokenAddress,
              encoding: 'jsonParsed'
            }
          }));
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);

            // Update token data
            setData(current => ({
              ...current,
              marketStats: {
                marketCap: data.marketCap,
                circulatingSupply: data.supply?.circulating || 0,
                totalSupply: data.supply?.total || 0,
                maxSupply: data.supply?.max || 0,
                priceChange24h: data.priceChanges?.["24h"] || 0,
                volume24h: data.volume?.["24h"] || 0,
                liquidity24h: data.liquidity?.total || 0,
                ath: data.highLow?.ath || { price: 0, timestamp: 0 },
                atl: data.highLow?.atl || { price: 0, timestamp: 0 }
              },
              socialMetrics: {
                communityScore: data.social?.score || 0,
                socialVolume: data.social?.volume || 0,
                sentiment: data.social?.sentiment || 'neutral',
                trendingTopics: data.social?.trending || []
              },
              realtime: {
                currentPrice: data.price || 0,
                lastTrade: data.lastTrade,
                bidAskSpread: data.orderBook?.spread || 0
              }
            }));
          } catch (error) {
            console.error('[Helius] Message processing error:', error);
          }
        };

        ws.onerror = (error) => {
          console.error('[Helius] WebSocket error:', error);
          setError('Connection error');
        };

        ws.onclose = () => {
          setIsLoading(true);
          if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
            reconnectAttempts++;
            console.log(`[Helius] Attempting reconnect ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}`);
            reconnectTimeout = setTimeout(() => {
              connect();
            }, RECONNECT_DELAY * Math.pow(1.5, reconnectAttempts));
          } else {
            setError('Connection failed after maximum retries');
          }
        };

      } catch (error) {
        console.error('[Helius] Connection failed:', error);
        setError('Failed to establish connection');
      }
    };

    connect();

    // Cleanup
    return () => {
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
      if (ws) {
        ws.close();
      }
    };
  }, [tokenAddress]);

  return { data, isLoading, error };
}
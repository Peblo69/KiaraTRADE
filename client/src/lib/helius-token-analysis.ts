import React, { useState, useEffect } from 'react';
import { create } from 'zustand';

// 1. Correct URL format
const HELIUS_API_KEY = process.env.NEXT_PUBLIC_HELIUS_API_KEY;
const HELIUS_WS_URL = `wss://rpc.helius.xyz/?api-key=${HELIUS_API_KEY}`;

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

// Store for managing active WebSocket subscriptions
interface WsStore {
  connections: Record<string, WebSocket>;
  subscribers: Record<string, Set<string>>;
  addSubscriber: (tokenAddress: string, subscriberId: string) => void;
  removeSubscriber: (tokenAddress: string, subscriberId: string) => void;
  getConnection: (tokenAddress: string) => WebSocket | null;
  setConnection: (tokenAddress: string, ws: WebSocket) => void;
  removeConnection: (tokenAddress: string) => void;
}

const useWsStore = create<WsStore>((set, get) => ({
  connections: {},
  subscribers: {},
  addSubscriber: (tokenAddress, subscriberId) => {
    set(state => {
      const currentSubs = state.subscribers[tokenAddress] || new Set();
      currentSubs.add(subscriberId);
      return {
        subscribers: {
          ...state.subscribers,
          [tokenAddress]: currentSubs
        }
      };
    });
  },
  removeSubscriber: (tokenAddress, subscriberId) => {
    set(state => {
      const currentSubs = state.subscribers[tokenAddress];
      if (currentSubs) {
        currentSubs.delete(subscriberId);
        if (currentSubs.size === 0) {
          const { [tokenAddress]: _, ...rest } = state.subscribers;
          return { subscribers: rest };
        }
      }
      return state;
    });
  },
  getConnection: (tokenAddress) => get().connections[tokenAddress] || null,
  setConnection: (tokenAddress, ws) => set(state => ({
    connections: { ...state.connections, [tokenAddress]: ws }
  })),
  removeConnection: (tokenAddress) => set(state => {
    const { [tokenAddress]: _, ...rest } = state.connections;
    return { connections: rest };
  })
}));

// Cache store for token data
interface CacheStore {
  cache: Record<string, TokenData>;
  setData: (tokenAddress: string, data: TokenData) => void;
  getData: (tokenAddress: string) => TokenData | null;
}

const useCacheStore = create<CacheStore>((set, get) => ({
  cache: {},
  setData: (tokenAddress, data) => set(state => ({
    cache: { ...state.cache, [tokenAddress]: data }
  })),
  getData: (tokenAddress) => get().cache[tokenAddress] || null
}));

function createWebSocket(tokenAddress: string, onData: (data: TokenData) => void) {
  if (!HELIUS_API_KEY) {
    throw new Error('Missing Helius API key');
  }

  const ws = new WebSocket(HELIUS_WS_URL);
  let reconnectAttempts = 0;
  let reconnectTimeout: NodeJS.Timeout | null = null;
  const MAX_RECONNECT_ATTEMPTS = 5;
  const RECONNECT_DELAY = 5000;

  ws.onopen = () => {
    console.log('[Helius] Connected');
    reconnectAttempts = 0;

    // 2. Correct subscription format
    ws.send(JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'tokenMetadataSubscribe',
      params: [
        tokenAddress,
        {
          encoding: 'jsonParsed',
          commitment: 'confirmed'
        }
      ]
    }));
  };

  ws.onmessage = (event) => {
    try {
      const response = JSON.parse(event.data);

      // 3. Check if it's a subscription message
      if (response.method === 'tokenMetadataNotification') {
        const tokenData = response.params.result;

        const formattedData: TokenData = {
          marketStats: {
            marketCap: tokenData.marketCap || 0,
            circulatingSupply: tokenData.supply?.circulating || 0,
            totalSupply: tokenData.supply?.total || 0,
            maxSupply: tokenData.supply?.max || 0,
            priceChange24h: tokenData.priceHistory?.['24h']?.percentage || 0,
            volume24h: tokenData.volume?.['24h'] || 0,
            liquidity24h: tokenData.liquidity || 0,
            ath: tokenData.ath || { price: 0, timestamp: 0 },
            atl: tokenData.atl || { price: 0, timestamp: 0 }
          },
          socialMetrics: {
            communityScore: tokenData.social?.score || 0,
            socialVolume: tokenData.social?.volume || 0,
            sentiment: tokenData.social?.sentiment || 'neutral',
            trendingTopics: tokenData.social?.trending || []
          },
          realtime: {
            currentPrice: tokenData.price || 0,
            lastTrade: tokenData.lastTrade || null,
            bidAskSpread: tokenData.orderBook?.spread || 0
          }
        };

        onData(formattedData);
        useCacheStore.getState().setData(tokenAddress, formattedData);
      }
    } catch (error) {
      console.error('[Helius] Message processing error:', error);
    }
  };

  ws.onerror = (error) => {
    console.error('[Helius] WebSocket error:', error);
  };

  ws.onclose = () => {
    useWsStore.getState().removeConnection(tokenAddress);

    if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
      reconnectAttempts++;
      console.log(`[Helius] Attempting reconnect ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}`);

      reconnectTimeout = setTimeout(() => {
        const subscribers = useWsStore.getState().subscribers[tokenAddress];
        if (subscribers && subscribers.size > 0) {
          const newWs = createWebSocket(tokenAddress, onData);
          useWsStore.getState().setConnection(tokenAddress, newWs);
        }
      }, RECONNECT_DELAY * Math.pow(1.5, reconnectAttempts));
    }
  };

  return ws;
}

// React hook for components
export function useTokenAnalysis(tokenAddress: string) {
  const [data, setData] = useState<TokenData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const subscriberId = React.useId();

  useEffect(() => {
    if (!tokenAddress || !HELIUS_API_KEY) {
      setError('Missing token address or API key');
      return;
    }

    try {
      // Check cache first
      const cachedData = useCacheStore.getState().getData(tokenAddress);
      if (cachedData) {
        setData(cachedData);
        setIsLoading(false);
      }

      // Handle WebSocket connection
      let ws = useWsStore.getState().getConnection(tokenAddress);
      if (!ws) {
        ws = createWebSocket(tokenAddress, setData);
        useWsStore.getState().setConnection(tokenAddress, ws);
      }

      useWsStore.getState().addSubscriber(tokenAddress, subscriberId);
      setIsLoading(false);

      return () => {
        useWsStore.getState().removeSubscriber(tokenAddress, subscriberId);
        const subscribers = useWsStore.getState().subscribers[tokenAddress];

        if (!subscribers || subscribers.size === 0) {
          const connection = useWsStore.getState().getConnection(tokenAddress);
          if (connection) {
            connection.close();
            useWsStore.getState().removeConnection(tokenAddress);
          }
        }
      };
    } catch (error: any) {
      setError(error.message || 'Failed to connect to Helius');
      setIsLoading(false);
    }
  }, [tokenAddress, subscriberId]);

  return { data, isLoading, error };
}
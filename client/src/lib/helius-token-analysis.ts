import { useState, useEffect, useRef } from 'react';
import { usePumpPortalStore } from '@/lib/pump-portal-websocket';
import { calculatePumpFunTokenMetrics, calculateVolumeMetrics } from '@/utils/token-calculations';
import { Token, TokenTrade } from '@/types/token';

const HELIUS_API_KEY = process.env.NEXT_PUBLIC_HELIUS_API_KEY;
const HELIUS_WS_URL = `wss://rpc.helius.xyz/?api-key=${HELIUS_API_KEY}`;

interface MarketData {
  price: string;
  priceChange24h: {
    value: number;
    isPositive: boolean;
  };
  volume24h: string;
  marketCap: string;
  liquidity: string;
  ath: string;
  atl: string;
  totalSupply: string;
  circulatingSupply: string;
}

export function useTokenAnalysis(tokenAddress: string) {
  const [marketData, setMarketData] = useState<MarketData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const ws = useRef<WebSocket | null>(null);

  // Get PumpPortal data
  const token = usePumpPortalStore(state => state.getToken(tokenAddress));
  const solPrice = usePumpPortalStore(state => state.solPrice);

  useEffect(() => {
    if (!tokenAddress || !HELIUS_API_KEY) {
      setError('Missing token address or API key');
      return;
    }

    // Initialize with PumpPortal data
    if (token) {
      updateMarketData(token);
    }

    // Connect to Helius for real-time updates
    ws.current = new WebSocket(HELIUS_WS_URL);

    ws.current.onopen = () => {
      console.log('[Helius] Connected');
      ws.current?.send(JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'accountSubscribe',
        params: [
          tokenAddress,
          {
            commitment: 'confirmed',
            encoding: 'jsonParsed'
          }
        ]
      }));
    };

    ws.current.onmessage = (event) => {
      try {
        const response = JSON.parse(event.data);

        if (response.method === 'accountNotification') {
          const accountInfo = response.params.result.value;

          // Update market data with real-time values
          if (token) {
            const updatedToken = {
              ...token,
              vSolInBondingCurve: accountInfo.lamports / 1e9,
              vTokensInBondingCurve: accountInfo.tokenAmount?.uiAmount || token.vTokensInBondingCurve
            };

            updateMarketData(updatedToken);
          }
        }
      } catch (error) {
        console.error('[Helius] Message processing error:', error);
      }
    };

    ws.current.onerror = (error) => {
      console.error('[Helius] WebSocket error:', error);
      setError('Connection error');
    };

    ws.current.onclose = () => {
      console.log('[Helius] Connection closed');
      setIsLoading(true);
      // Implement reconnection logic if needed
      setTimeout(() => {
        if (token) {
          // Re-establish connection
          ws.current = new WebSocket(HELIUS_WS_URL);
        }
      }, 5000);
    };

    return () => {
      ws.current?.close();
    };
  }, [tokenAddress, token]);

  // Update market data when token or solPrice changes
  useEffect(() => {
    if (token) {
      updateMarketData(token);
    }
  }, [token, solPrice]);

  function updateMarketData(token: Token) {
    const metrics = calculatePumpFunTokenMetrics({
      vSolInBondingCurve: token.vSolInBondingCurve || 0,
      vTokensInBondingCurve: token.vTokensInBondingCurve || 0,
      solPrice: solPrice || 0
    });

    const volumeMetrics = calculateVolumeMetrics(token.recentTrades || []);

    // Calculate 24h price change
    const last24h = token.recentTrades?.filter(
      trade => trade.timestamp > Date.now() - 24 * 60 * 60 * 1000
    ) || [];

    const priceChange24h = (() => {
      if (last24h.length < 2) return { value: 0, isPositive: false };
      const current = metrics.price.usd;
      const old = last24h[last24h.length - 1].solAmount * (solPrice || 0);
      const change = ((current - old) / old) * 100;
      return { value: Math.abs(change), isPositive: change >= 0 };
    })();

    setMarketData({
      price: `$${metrics.price.usd.toFixed(8)}`,
      priceChange24h,
      volume24h: `$${volumeMetrics.volume24h.usd.toLocaleString()}`,
      marketCap: `$${metrics.marketCap.usd.toLocaleString()}`,
      liquidity: `$${(token.vSolInBondingCurve * (solPrice || 0)).toLocaleString()}`,
      ath: token.ath ? `$${token.ath.toFixed(8)}` : 'N/A',
      atl: token.atl ? `$${token.atl.toFixed(8)}` : 'N/A',
      totalSupply: token.vTokensInBondingCurve?.toLocaleString() || 'N/A',
      circulatingSupply: token.vTokensInBondingCurve?.toLocaleString() || 'N/A'
    });

    setIsLoading(false);
  }

  return { marketData, isLoading, error };
}
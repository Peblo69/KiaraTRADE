import { useState, useEffect, useRef } from 'react';
import { usePumpPortalStore } from '@/lib/pump-portal-websocket';
import { Token, TokenTrade } from '@/types/token';

const HELIUS_API_KEY = process.env.NEXT_PUBLIC_HELIUS_API_KEY;
const HELIUS_WS_URL = `wss://rpc.helius.xyz/?api-key=${HELIUS_API_KEY}`;

export function useTradeHistory(tokenAddress: string) {
  const [trades, setTrades] = useState<TokenTrade[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const ws = useRef<WebSocket | null>(null);

  // Get PumpPortal data
  const token = usePumpPortalStore(state => state.getToken(tokenAddress));
  const solPrice = usePumpPortalStore(state => state.solPrice);

  useEffect(() => {
    if (!tokenAddress || !HELIUS_API_KEY) {
      setIsLoading(false);
      return;
    }

    // Initialize with PumpPortal trade history
    if (token?.recentTrades) {
      setTrades(token.recentTrades.sort((a, b) => b.timestamp - a.timestamp));
      setIsLoading(false);
    }

    // Connect to Helius for real-time trades
    ws.current = new WebSocket(HELIUS_WS_URL);

    ws.current.onopen = () => {
      console.log('[Helius] Trade History Connected');
      ws.current?.send(JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'accountSubscribe',
        params: [
          tokenAddress,
          {
            commitment: 'confirmed',
            encoding: 'jsonParsed',
            filters: [{ 
              memcmp: {
                offset: 0,
                bytes: tokenAddress
              }
            }]
          }
        ]
      }));
    };

    ws.current.onmessage = (event) => {
      try {
        const response = JSON.parse(event.data);

        if (response.method === 'accountNotification') {
          const txInfo = response.params.result.value;
          const amount = txInfo.tokenAmount?.uiAmount || 0;

          // Skip empty trades
          if (amount === 0) return;

          // Create new trade entry
          const newTrade: TokenTrade = {
            timestamp: Date.now(),
            type: amount > 0 ? 'buy' : 'sell',
            traderPublicKey: txInfo.owner,
            tokenAmount: Math.abs(amount),
            solAmount: txInfo.lamports / 1e9,
            signature: txInfo.txId || response.params.result.signature,
            mint: tokenAddress
          };

          // Add new trade to the list
          setTrades(current => {
            const updated = [newTrade, ...current];
            // Keep last 100 trades
            return updated.slice(0, 100);
          });
        }
      } catch (error) {
        console.error('[Helius] Trade processing error:', error);
      }
    };

    ws.current.onerror = (error) => {
      console.error('[Helius] WebSocket error:', error);
    };

    ws.current.onclose = () => {
      console.log('[Helius] Connection closed');
      // Attempt to reconnect
      setTimeout(() => {
        if (token) {
          ws.current = new WebSocket(HELIUS_WS_URL);
        }
      }, 5000);
    };

    return () => {
      ws.current?.close();
    };
  }, [tokenAddress, token]);

  return { trades, isLoading };
}
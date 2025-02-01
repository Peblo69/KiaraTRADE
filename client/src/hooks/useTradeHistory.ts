import { useState, useEffect, useRef } from 'react';
import { usePumpPortalStore } from '@/lib/pump-portal-websocket';
import { TokenTrade } from '@/types/token';

const HELIUS_API_KEY = process.env.NEXT_PUBLIC_HELIUS_API_KEY;
const HELIUS_WS_URL = `wss://rpc.helius.xyz/?api-key=${HELIUS_API_KEY}`;

export function useTradeHistory(tokenAddress: string) {
  const [trades, setTrades] = useState<TokenTrade[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const ws = useRef<WebSocket | null>(null);

  // Get PumpPortal data and subscribe to its updates
  const token = usePumpPortalStore(state => state.getToken(tokenAddress));
  const solPrice = usePumpPortalStore(state => state.solPrice);

  // Subscribe to PumpPortal trade updates
  useEffect(() => {
    const unsubscribe = usePumpPortalStore.subscribe((state, prevState) => {
      const currentToken = state.getToken(tokenAddress);
      const prevToken = prevState.getToken(tokenAddress);

      if (currentToken?.recentTrades !== prevToken?.recentTrades) {
        setTrades(currentToken?.recentTrades || []);
      }
    });

    return () => unsubscribe();
  }, [tokenAddress]);

  // Subscribe to Helius for real-time updates
  useEffect(() => {
    console.log('[Helius] Connecting for token:', tokenAddress);

    ws.current = new WebSocket(HELIUS_WS_URL);

    ws.current.onopen = () => {
      console.log('[Helius] Connected');
      // Subscribe to token trades
      ws.current?.send(JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'subscribeTransactions',  // Changed this
        params: [
          {
            account: tokenAddress,
            commitment: 'confirmed',
            encoding: 'jsonParsed'
          }
        ]
      }));
    };

    let reconnectTimeout: NodeJS.Timeout;

    ws.current.onmessage = (event) => {
      try {
        const response = JSON.parse(event.data);
        console.log('[Helius] Received:', response);

        if (response.method === 'transactionNotification') {
          const tx = response.params.result;

          // Create new trade
          const newTrade: TokenTrade = {
            timestamp: Date.now(),
            txType: tx.type === 'buy' ? 'buy' : 'sell',
            traderPublicKey: tx.accountData.owner,
            tokenAmount: Math.abs(tx.tokenTransfers?.[0]?.amount || 0),
            solAmount: tx.nativeTransfers?.[0]?.amount / 1e9 || 0,
            signature: tx.signature,
            mint: tokenAddress,
            priceInUsd: (tx.nativeTransfers?.[0]?.amount / 1e9) * solPrice
          };

          console.log('[Helius] New trade:', newTrade);

          setTrades(current => {
            const updated = [newTrade, ...current];
            console.log('[Helius] Updated trades:', updated);
            return updated.slice(0, 100); // Keep last 100 trades
          });
        }
      } catch (error) {
        console.error('[Helius] Process error:', error);
      }
    };

    ws.current.onclose = () => {
      console.log('[Helius] Disconnected');
      reconnectTimeout = setTimeout(() => {
        console.log('[Helius] Attempting reconnect...');
        ws.current = new WebSocket(HELIUS_WS_URL);
      }, 5000);
    };

    setIsLoading(false);

    return () => {
      clearTimeout(reconnectTimeout);
      ws.current?.close();
    };
  }, [tokenAddress, solPrice]);

  return { trades, isLoading };
}
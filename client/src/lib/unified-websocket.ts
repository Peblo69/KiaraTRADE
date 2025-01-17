import { useUnifiedTokenStore } from './unified-token-store';

class UnifiedWebSocket {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 5000;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private batchTimeout: NodeJS.Timeout | null = null;
  private pendingUpdates: Map<string, {
    price?: number;
    marketCap?: number;
    volume?: number;
    transactions?: Array<{
      signature: string;
      buyer: string;
      solAmount: number;
      timestamp: number;
    }>;
  }> = new Map();

  private processBatchUpdates = () => {
    if (this.pendingUpdates.size === 0) return;
    const store = useUnifiedTokenStore.getState();

    this.pendingUpdates.forEach((updates, tokenAddress) => {
      if (updates.price !== undefined) {
        // Batch update token state
        store.updateToken(tokenAddress, {
          price: updates.price,
          marketCapSol: updates.marketCap || 0,
          volume24h: updates.volume || 0,
        });

        // Add price point in a single update
        store.addPricePoint(
          tokenAddress,
          updates.price,
          updates.marketCap || 0,
          updates.volume || 0
        );
      }

      // Process transactions in batch if any
      if (updates.transactions?.length) {
        updates.transactions.forEach(tx => {
          store.addTransaction(tokenAddress, {
            signature: tx.signature,
            buyer: tx.buyer,
            solAmount: tx.solAmount,
            tokenAmount: tx.solAmount / (updates.price || 1),
            timestamp: tx.timestamp,
            type: 'sell'
          });
        });
      }
    });

    this.pendingUpdates.clear();
  };

  private scheduleUpdate(tokenAddress: string, updates: any) {
    const currentUpdates = this.pendingUpdates.get(tokenAddress) || {};
    this.pendingUpdates.set(tokenAddress, {
      ...currentUpdates,
      ...updates,
      transactions: [
        ...(currentUpdates.transactions || []),
        ...(updates.transactions || [])
      ]
    });

    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
    }

    this.batchTimeout = setTimeout(this.processBatchUpdates, 100);
  }

  private handleTokenUpdate(data: any) {
    if (!data.mint || !data.solAmount) return;

    const tokenAddress = data.mint;
    const price = data.solAmount / (data.tokenAmount || data.initialBuy);

    this.scheduleUpdate(tokenAddress, {
      price,
      marketCap: data.marketCapSol || 0,
      volume: data.solAmount,
      transactions: [{
        signature: data.signature,
        buyer: data.traderPublicKey,
        solAmount: data.solAmount,
        timestamp: Date.now()
      }]
    });
  }

  connect() {
    if (this.ws?.readyState === WebSocket.OPEN) {
      console.log('[Unified WebSocket] Already connected');
      return;
    }

    try {
      console.log('[Unified WebSocket] Attempting to connect...');
      // Change to wss protocol and add error handling
      this.ws = new WebSocket('wss://pumpportal.fun/api/data', undefined, {
        rejectUnauthorized: false // Allow self-signed certificates
      });

      this.ws.onopen = () => {
        console.log('[Unified WebSocket] Connected successfully');
        useUnifiedTokenStore.getState().setConnected(true);
        this.reconnectAttempts = 0;
        this.startHeartbeat();
        this.subscribeToEvents();
      };

      this.ws.onmessage = async (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.txType === 'create' || data.txType === 'trade') {
            if (data.mint && data.traderPublicKey) {
              this.handleTokenUpdate(data);
            }

            if (data.txType === 'create') {
              const token = {
                name: data.name || 'Unknown',
                symbol: data.symbol || 'UNKNOWN',
                marketCap: data.marketCapSol || 0,
                marketCapSol: data.marketCapSol || 0,
                liquidityAdded: data.pool === "pump",
                holders: data.holders || 0,
                volume24h: data.volume24h || 0,
                address: data.mint,
                price: data.solAmount / data.initialBuy,
                imageUrl: data.uri,
                uri: data.uri,
                signature: data.signature,
                initialBuy: data.solAmount,
                solAmount: data.solAmount
              };

              await useUnifiedTokenStore.getState().addToken(token);
            }
          }
        } catch (error) {
          console.error('[Unified WebSocket] Error processing message:', error);
          useUnifiedTokenStore.getState().setError('Failed to process token data');
        }
      };

      this.ws.onclose = () => {
        this.cleanup();
        this.reconnect();
      };

      this.ws.onerror = (error) => {
        console.error('[Unified WebSocket] Connection error:', error);
        useUnifiedTokenStore.getState().setError('WebSocket connection error');
        this.cleanup();
        this.reconnect();
      };

    } catch (error) {
      console.error('[Unified WebSocket] Failed to establish connection:', error);
      useUnifiedTokenStore.getState().setError('Failed to establish WebSocket connection');
      this.cleanup();
      this.reconnect();
    }
  }

  private startHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.heartbeatInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: "ping" }));
      }
    }, 30000);
  }

  private subscribeToEvents() {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        method: "subscribeNewToken"
      }));
    }
  }

  private cleanup() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = null;
    }

    useUnifiedTokenStore.getState().setConnected(false);
  }

  private reconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      useUnifiedTokenStore.getState().setError('Maximum reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    setTimeout(() => {
      this.connect();
    }, this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1));
  }

  disconnect() {
    if (this.ws) {
      this.cleanup();
      this.ws.close();
      this.ws = null;
    }
  }
}

export const unifiedWebSocket = new UnifiedWebSocket();
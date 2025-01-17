import { useUnifiedTokenStore } from './unified-token-store';

class UnifiedWebSocket {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 5000;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private updateQueue = new Map<string, {
    timeout: NodeJS.Timeout;
    updates: Array<{
      price: number;
      marketCap: number;
      volume: number;
      signature: string;
      buyer: string;
      timestamp: number;
    }>;
  }>();
  private readonly UPDATE_DEBOUNCE = 2000;
  private readonly BATCH_SIZE = 5;

  private async parseTokenMetadata(uri: string) {
    try {
      if (!uri) return null;
      const response = await fetch(uri);
      if (!response.ok) throw new Error('Failed to fetch metadata');
      return await response.json();
    } catch (error) {
      console.error('[Unified WebSocket] Error fetching token metadata:', error);
      return null;
    }
  }

  private processQueuedUpdates(tokenAddress: string) {
    const queueData = this.updateQueue.get(tokenAddress);
    if (!queueData || queueData.updates.length === 0) return;

    const { updates } = queueData;
    const lastUpdate = updates[updates.length - 1];
    const store = useUnifiedTokenStore.getState();

    // Batch update price and transaction data
    store.addPricePoint(
      tokenAddress,
      lastUpdate.price,
      lastUpdate.marketCap,
      updates.reduce((sum, u) => sum + u.volume, 0)
    );

    store.addTransaction(tokenAddress, {
      signature: lastUpdate.signature,
      buyer: lastUpdate.buyer,
      solAmount: lastUpdate.volume,
      tokenAmount: lastUpdate.volume / lastUpdate.price,
      timestamp: lastUpdate.timestamp,
      type: 'sell'
    });

    // Update token data
    store.updateToken(tokenAddress, {
      price: lastUpdate.price,
      marketCapSol: lastUpdate.marketCap,
      volume24h: updates.reduce((sum, u) => sum + u.volume, 0)
    });

    // Clear the queue
    this.updateQueue.delete(tokenAddress);
  }

  private handleTokenUpdate(data: any) {
    if (!data.mint || !data.solAmount) return;

    const tokenAddress = data.mint;
    const price = data.solAmount / (data.tokenAmount || data.initialBuy);
    const update = {
      price,
      marketCap: data.marketCapSol || 0,
      volume: data.solAmount,
      signature: data.signature,
      buyer: data.traderPublicKey,
      timestamp: Date.now()
    };

    const queueData = this.updateQueue.get(tokenAddress);
    if (queueData) {
      clearTimeout(queueData.timeout);
      queueData.updates.push(update);

      if (queueData.updates.length >= this.BATCH_SIZE) {
        this.processQueuedUpdates(tokenAddress);
      } else {
        queueData.timeout = setTimeout(() => {
          this.processQueuedUpdates(tokenAddress);
        }, this.UPDATE_DEBOUNCE);
      }
    } else {
      const timeout = setTimeout(() => {
        this.processQueuedUpdates(tokenAddress);
      }, this.UPDATE_DEBOUNCE);

      this.updateQueue.set(tokenAddress, {
        timeout,
        updates: [update]
      });
    }
  }

  connect() {
    if (this.ws?.readyState === WebSocket.OPEN) {
      console.log('[Unified WebSocket] Already connected');
      return;
    }

    try {
      console.log('[Unified WebSocket] Attempting to connect...');
      this.ws = new WebSocket('wss://pumpportal.fun/api/data');

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

              if (token.uri) {
                const metadata = await this.parseTokenMetadata(token.uri);
                if (metadata) {
                  useUnifiedTokenStore.getState().updateToken(token.address, { metadata });
                }
              }
            }
          }
        } catch (error) {
          console.error('[Unified WebSocket] Error processing message:', error);
          useUnifiedTokenStore.getState().setError('Failed to process token data');
        }
      };

      this.ws.onclose = () => {
        console.log('[Unified WebSocket] Connection closed');
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
    useUnifiedTokenStore.getState().setConnected(false);
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private reconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      useUnifiedTokenStore.getState().setError('Maximum reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    console.log(`[Unified WebSocket] Attempting reconnect (#${this.reconnectAttempts})`);

    setTimeout(() => {
      this.connect();
    }, this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1));
  }

  disconnect() {
    if (this.ws) {
      console.log('[Unified WebSocket] Disconnecting');
      this.cleanup();
      this.ws.close();
      this.ws = null;
    }
  }
}

export const unifiedWebSocket = new UnifiedWebSocket();

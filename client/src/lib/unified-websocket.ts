import { useUnifiedTokenStore } from './unified-token-store';

class UnifiedWebSocket {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 5000;
  private heartbeatInterval: NodeJS.Timeout | null = null;

  connect() {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      this.ws = new WebSocket('wss://pumpportal.fun/api/data', undefined, {
        rejectUnauthorized: false
      });

      this.ws.onopen = () => {
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
          useUnifiedTokenStore.getState().setError('Failed to process token data');
        }
      };

      this.ws.onclose = () => {
        this.cleanup();
        this.reconnect();
      };

      this.ws.onerror = () => {
        useUnifiedTokenStore.getState().setError('WebSocket connection error');
        this.cleanup();
        this.reconnect();
      };

    } catch (error) {
      useUnifiedTokenStore.getState().setError('Failed to establish WebSocket connection');
      this.cleanup();
      this.reconnect();
    }
  }

  private handleTokenUpdate(data: any) {
    if (!data.mint || !data.solAmount) return;

    const tokenAddress = data.mint;
    const price = data.solAmount / (data.tokenAmount || data.initialBuy);

    useUnifiedTokenStore.getState().updateToken(tokenAddress, {
      price,
      marketCapSol: data.marketCapSol || 0,
      volume24h: data.volume24h || 0,
    });

    useUnifiedTokenStore.getState().addTransaction(tokenAddress, {
      signature: data.signature,
      buyer: data.traderPublicKey,
      solAmount: data.solAmount,
      tokenAmount: data.tokenAmount || data.initialBuy,
      timestamp: Date.now(),
      type: 'sell'
    });
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
import { useUnifiedTokenStore } from './unified-token-store';

class UnifiedWebSocket {
  private ws: WebSocket | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;

  connect() {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      this.ws = new WebSocket('wss://pumpportal.fun/api/data');

      this.ws.onopen = () => {
        useUnifiedTokenStore.getState().setConnected(true);
        this.startHeartbeat();
        this.subscribeToEvents();
      };

      this.ws.onmessage = (event) => {
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
                initialBuy: data.solAmount,
                solAmount: data.solAmount
              };

              useUnifiedTokenStore.getState().addToken(token);
            }
          }
        } catch (error) {
          useUnifiedTokenStore.getState().setError('Failed to process token data');
        }
      };

      this.ws.onclose = () => {
        this.cleanup();
      };

      this.ws.onerror = () => {
        useUnifiedTokenStore.getState().setError('WebSocket connection error');
        this.cleanup();
      };

    } catch (error) {
      useUnifiedTokenStore.getState().setError('Failed to establish WebSocket connection');
      this.cleanup();
    }
  }

  private handleTokenUpdate(data: any) {
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
      type: data.txType === 'create' ? 'buy' : 'sell'
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

  disconnect() {
    if (this.ws) {
      this.cleanup();
      this.ws.close();
      this.ws = null;
    }
  }
}

export const unifiedWebSocket = new UnifiedWebSocket();
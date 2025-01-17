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
        console.log('[Unified WebSocket] Connected successfully');
        useUnifiedTokenStore.getState().setConnected(true);
        this.startHeartbeat();
        this.subscribeToEvents();
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.txType === 'create' || data.txType === 'trade') {
            console.log('[Unified WebSocket] Received token data:', {
              type: data.txType,
              name: data.name,
              symbol: data.symbol,
              mint: data.mint,
              imageUrl: data.uri || data.metadata?.image,
            });

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
                imageUrl: this.getTokenImageUrl(data),
                uri: data.uri,
                initialBuy: data.solAmount,
                solAmount: data.solAmount,
                metadata: data.metadata || null
              };

              console.log('[Unified WebSocket] Adding new token:', {
                ...token,
                address: token.address,
                imageUrl: token.imageUrl
              });

              useUnifiedTokenStore.getState().addToken(token);
            }
          }
        } catch (error) {
          console.error('[Unified WebSocket] Failed to process token data:', error);
          useUnifiedTokenStore.getState().setError('Failed to process token data');
        }
      };

      this.ws.onclose = () => {
        console.log('[Unified WebSocket] Connection closed');
        this.cleanup();
      };

      this.ws.onerror = (error) => {
        console.error('[Unified WebSocket] Connection error:', error);
        useUnifiedTokenStore.getState().setError('WebSocket connection error');
        this.cleanup();
      };

    } catch (error) {
      console.error('[Unified WebSocket] Failed to establish connection:', error);
      useUnifiedTokenStore.getState().setError('Failed to establish WebSocket connection');
      this.cleanup();
    }
  }

  private getTokenImageUrl(data: any): string {
    // Try different possible image sources in order of preference
    return data.uri || 
           data.metadata?.image || 
           `https://pump.fun/token/${data.mint}/image` ||
           'https://cryptologos.cc/logos/solana-sol-logo.png';
  }

  private handleTokenUpdate(data: any) {
    const tokenAddress = data.mint;
    const price = data.solAmount / (data.tokenAmount || data.initialBuy);

    // Update token with new data including any image updates
    useUnifiedTokenStore.getState().updateToken(tokenAddress, {
      price,
      marketCapSol: data.marketCapSol || 0,
      volume24h: data.volume24h || 0,
      imageUrl: this.getTokenImageUrl(data), // Update image URL if available
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
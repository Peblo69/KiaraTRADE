import { useUnifiedTokenStore } from './unified-token-store';

class UnifiedWebSocket {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 5000;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private isReconnecting = false;

  connect() {
    if (this.ws?.readyState === WebSocket.OPEN || this.isReconnecting) {
      console.log('[Unified WebSocket] Already connected or reconnecting');
      return;
    }

    try {
      this.isReconnecting = true;
      console.log('[Unified WebSocket] Attempting to connect...');
      this.ws = new WebSocket('wss://pump.fun/ws/v1');

      this.ws.onopen = () => {
        console.log('[Unified WebSocket] Connected successfully');
        this.isReconnecting = false;
        this.reconnectAttempts = 0;
        this.startHeartbeat();
        this.subscribeToEvents();
        useUnifiedTokenStore.getState().setConnected(true);
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'token') {
            this.handleTokenUpdate(data);
          }
        } catch (error) {
          console.error('[Unified WebSocket] Error processing message:', error);
        }
      };

      this.ws.onclose = () => {
        if (!this.isReconnecting) {
          console.log('[Unified WebSocket] Connection closed');
          this.cleanup();
          this.reconnect();
        }
      };

      this.ws.onerror = (error) => {
        console.error('[Unified WebSocket] Connection error:', error);
        if (!this.isReconnecting) {
          this.cleanup();
          this.reconnect();
        }
      };

    } catch (error) {
      console.error('[Unified WebSocket] Failed to establish connection:', error);
      this.isReconnecting = false;
      this.cleanup();
      this.reconnect();
    }
  }

  private handleTokenUpdate(data: any) {
    const store = useUnifiedTokenStore.getState();
    const existingToken = store.getToken(data.address);

    // Only update if data actually changed
    if (!existingToken || 
        existingToken.price !== data.price || 
        existingToken.marketCapSol !== data.marketCapSol) {
      store.updateToken(data.address, {
        price: data.price,
        marketCapSol: data.marketCapSol,
        volume24h: data.volume24h
      });
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
        type: "subscribe",
        channel: "tokens"
      }));
    }
  }

  private cleanup() {
    console.log('[Unified WebSocket] Cleaning up connection');
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    // Only set disconnected if we're not in the process of reconnecting
    if (!this.isReconnecting) {
      useUnifiedTokenStore.getState().setConnected(false);
    }
  }

  private reconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[Unified WebSocket] Max reconnection attempts reached');
      this.isReconnecting = false;
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
      this.isReconnecting = false;
      this.cleanup();
      this.ws.close();
      this.ws = null;
    }
  }
}

export const unifiedWebSocket = new UnifiedWebSocket();
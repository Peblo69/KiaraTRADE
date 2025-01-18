import { useUnifiedTokenStore } from './unified-token-store';

class UnifiedWebSocket {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 5000;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private isReconnecting = false;
  private isConnecting = false;
  private isManualDisconnect = false;

  connect() {
    if (this.ws?.readyState === WebSocket.OPEN) {
      console.log('[Unified WebSocket] Already connected');
      return;
    }

    if (this.isConnecting || this.isReconnecting) {
      console.log('[Unified WebSocket] Connection attempt already in progress');
      return;
    }

    try {
      this.isConnecting = true;
      this.isManualDisconnect = false;
      console.log('[Unified WebSocket] Attempting to connect...');

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}`;

      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('[Unified WebSocket] Connected successfully');
        this.isConnecting = false;
        this.isReconnecting = false;
        this.reconnectAttempts = 0;
        this.startHeartbeat();
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'connection_status') {
            useUnifiedTokenStore.getState().setConnected(data.status === 'connected');
            return;
          }

          if (data.type === 'token' && data.data) {
            this.handleTokenUpdate(data.data);
          }
        } catch (error) {
          console.error('[Unified WebSocket] Error processing message:', error);
        }
      };

      this.ws.onclose = () => {
        console.log('[Unified WebSocket] Connection closed');
        this.cleanup();

        if (!this.isManualDisconnect) {
          this.reconnect();
        }
      };

      this.ws.onerror = (error) => {
        console.error('[Unified WebSocket] Connection error:', error);
        useUnifiedTokenStore.getState().setError('WebSocket connection error');
        this.cleanup();

        if (!this.isManualDisconnect) {
          this.reconnect();
        }
      };

    } catch (error) {
      console.error('[Unified WebSocket] Failed to establish connection:', error);
      useUnifiedTokenStore.getState().setError('Failed to establish WebSocket connection');
      this.isConnecting = false;
      this.cleanup();

      if (!this.isManualDisconnect) {
        this.reconnect();
      }
    }
  }

  private handleTokenUpdate(token: any) {
    if (!token?.address) {
      console.warn('[Unified WebSocket] Received invalid token data');
      return;
    }

    const store = useUnifiedTokenStore.getState();
    const existingToken = store.tokens.find(t => t.address === token.address);

    // Only update if data actually changed
    if (!existingToken || 
        existingToken.price !== token.price || 
        existingToken.marketCapSol !== token.marketCapSol ||
        existingToken.volume24h !== token.volume24h) {
      store.addToken(token);
    }
  }

  private startHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    this.heartbeatInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: "ping" }));
      }
    }, 30000);
  }

  private cleanup() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    if (!this.isReconnecting) {
      useUnifiedTokenStore.getState().setConnected(false);
    }
  }

  private reconnect() {
    if (this.isManualDisconnect) {
      return;
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts || this.isReconnecting) {
      console.error('[Unified WebSocket] Max reconnection attempts reached');
      this.isReconnecting = false;
      useUnifiedTokenStore.getState().setError('Maximum reconnection attempts reached');
      return;
    }

    this.isReconnecting = true;
    this.reconnectAttempts++;
    console.log(`[Unified WebSocket] Attempting reconnect (#${this.reconnectAttempts})`);

    setTimeout(() => {
      this.connect();
    }, this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1));
  }

  disconnect() {
    console.log('[Unified WebSocket] Disconnecting');
    this.isManualDisconnect = true;
    this.isReconnecting = false;
    this.isConnecting = false;
    this.cleanup();

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

export const unifiedWebSocket = new UnifiedWebSocket();
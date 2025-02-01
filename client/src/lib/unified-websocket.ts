import { useUnifiedTokenStore } from './unified-token-store';

const RECONNECT_DELAY = 5000;
const MAX_RECONNECT_ATTEMPTS = 5;

class UnifiedWebSocket {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private isManualDisconnect = false;

  constructor() {
    this.connect();
  }

  private connect() {
    try {
      console.log('[UnifiedWebSocket] Initializing connection...');
      this.ws = new WebSocket(process.env.VITE_PUMPPORTAL_WS_URL || '');

      this.ws.onopen = () => {
        console.log('[UnifiedWebSocket] Connected');
        this.reconnectAttempts = 0;
        useUnifiedTokenStore.getState().setConnected(true);
      };

      this.ws.onclose = () => {
        useUnifiedTokenStore.getState().setConnected(false);
        if (!this.isManualDisconnect && this.reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
          this.reconnectAttempts++;
          console.log(`[UnifiedWebSocket] Attempting reconnect ${this.reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}`);
          setTimeout(() => this.connect(), RECONNECT_DELAY * Math.pow(1.5, this.reconnectAttempts));
        }
      };

      this.ws.onerror = (error) => {
        console.error('[UnifiedWebSocket] Error:', error);
        useUnifiedTokenStore.getState().setError('WebSocket connection error');
      };

      this.ws.onmessage = this.handleMessage.bind(this);
    } catch (error) {
      console.error('[UnifiedWebSocket] Connection failed:', error);
      useUnifiedTokenStore.getState().setError('Failed to establish WebSocket connection');
    }
  }

  private async handleMessage(event: MessageEvent) {
    try {
      const data = JSON.parse(event.data);
      useUnifiedTokenStore.getState().updateToken(data);
    } catch (error) {
      console.error('[UnifiedWebSocket] Message processing error:', error);
    }
  }

  disconnect() {
    console.log('[UnifiedWebSocket] Disconnecting...');
    this.isManualDisconnect = true;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

export const unifiedWebSocket = new UnifiedWebSocket();
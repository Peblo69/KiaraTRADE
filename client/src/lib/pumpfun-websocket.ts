import { useTokenStore } from './unified-token-store';
import type { TokenData } from './unified-token-store';

const WEBSOCKET_URL = 'wss://pump.fun/ws/v1';
const RECONNECT_DELAY = 5000;
const MAX_RECONNECT_ATTEMPTS = 5;

class PumpFunWebSocket {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private processingQueue: boolean = false;

  connect() {
    if (this.ws?.readyState === WebSocket.OPEN) {
      console.log('[PumpFun] WebSocket already connected');
      return;
    }

    try {
      console.log('[PumpFun] Attempting to connect...');
      this.ws = new WebSocket(WEBSOCKET_URL);

      this.ws.onopen = this.handleOpen;
      this.ws.onmessage = this.handleMessage;
      this.ws.onclose = this.handleClose;
      this.ws.onerror = this.handleError;
    } catch (error) {
      console.error('[PumpFun] Connection error:', error);
      this.handleError(error);
    }
  }

  private handleOpen = () => {
    console.log('[PumpFun] Connected successfully');
    useTokenStore.getState().setConnected(true);
    this.reconnectAttempts = 0;
  };

  private handleMessage = async (event: MessageEvent) => {
    if (this.processingQueue) {
      return; // Skip if already processing
    }

    try {
      this.processingQueue = true;
      const data = JSON.parse(event.data);

      if (data.type === 'token_update') {
        const tokenData: TokenData = {
          address: data.token.address,
          name: data.token.name || 'Unknown',
          symbol: data.token.symbol || 'UNKNOWN',
          price: parseFloat(data.token.price) || 0,
          volume24h: parseFloat(data.token.volume24h) || 0,
          marketCap: parseFloat(data.token.marketCap) || 0,
          imageUrl: data.token.imageUrl,
          timestamp: Date.now()
        };

        useTokenStore.getState().addToken(tokenData);
      }
    } catch (error) {
      console.error('[PumpFun] Message processing error:', error);
    } finally {
      this.processingQueue = false;
    }
  };

  private handleClose = () => {
    console.log('[PumpFun] Connection closed');
    useTokenStore.getState().setConnected(false);
    this.cleanup();
    this.reconnect();
  };

  private handleError = (error: any) => {
    console.error('[PumpFun] WebSocket error:', error);
    useTokenStore.getState().setError('WebSocket connection error');
    this.cleanup();
    this.reconnect();
  };

  private cleanup() {
    if (this.ws) {
      this.ws.onopen = null;
      this.ws.onmessage = null;
      this.ws.onclose = null;
      this.ws.onerror = null;
      this.ws = null;
    }
  }

  private reconnect() {
    if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      useTokenStore.getState().setError('Maximum reconnection attempts reached');
      return;
    }

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    this.reconnectAttempts++;
    const delay = RECONNECT_DELAY * Math.pow(2, this.reconnectAttempts - 1);

    console.log(`[PumpFun] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
    this.reconnectTimeout = setTimeout(() => this.connect(), delay);
  }

  disconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.ws) {
      this.cleanup();
      this.ws.close();
    }
  }
}

export const pumpFunSocket = new PumpFunWebSocket();
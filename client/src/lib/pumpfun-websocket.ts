import { useTokenStore } from './unified-token-store';
import type { TokenData } from './unified-token-store';

const WEBSOCKET_URL = 'wss://pump.fun/ws/v1';
const RECONNECT_DELAY = 5000;
const MAX_RECONNECT_ATTEMPTS = 5;
const CONNECTION_TIMEOUT = 10000;

class PumpFunWebSocket {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private connectionTimeout: NodeJS.Timeout | null = null;
  private processingQueue: boolean = false;
  private isConnecting: boolean = false;

  connect() {
    if (this.isConnecting) {
      console.log('[PumpFun] Connection already in progress');
      return;
    }

    if (this.ws?.readyState === WebSocket.OPEN) {
      console.log('[PumpFun] WebSocket already connected');
      return;
    }

    try {
      this.isConnecting = true;
      console.log('[PumpFun] Attempting to connect...');

      // Clear any existing connection timeout
      if (this.connectionTimeout) {
        clearTimeout(this.connectionTimeout);
      }

      // Set connection timeout
      this.connectionTimeout = setTimeout(() => {
        console.log('[PumpFun] Connection attempt timed out');
        if (this.ws && this.ws.readyState === WebSocket.CONNECTING) {
          this.ws.close();
          this.handleError(new Error('Connection timeout'));
        }
      }, CONNECTION_TIMEOUT);

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
    this.isConnecting = false;
    this.reconnectAttempts = 0;

    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }

    useTokenStore.getState().setConnected(true);
  };

  private handleMessage = async (event: MessageEvent) => {
    if (this.processingQueue) {
      console.log('[PumpFun] Skipping message processing - queue busy');
      return;
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

  private handleClose = (event: CloseEvent) => {
    console.log('[PumpFun] Connection closed', event.code, event.reason);
    this.isConnecting = false;
    useTokenStore.getState().setConnected(false);
    this.cleanup();

    // Only attempt reconnect for unexpected closures
    if (event.code !== 1000) {
      this.reconnect();
    }
  };

  private handleError = (error: any) => {
    console.error('[PumpFun] WebSocket error:', error);
    this.isConnecting = false;
    useTokenStore.getState().setError('WebSocket connection error');
    this.cleanup();
    this.reconnect();
  };

  private cleanup() {
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }

    if (this.ws) {
      // Remove event listeners first
      this.ws.onopen = null;
      this.ws.onmessage = null;
      this.ws.onclose = null;
      this.ws.onerror = null;

      // Only attempt to close if the connection is still open or connecting
      if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
        try {
          this.ws.close(1000, 'Normal closure');
        } catch (error) {
          console.error('[PumpFun] Error closing WebSocket:', error);
        }
      }

      this.ws = null;
    }
  }

  private reconnect() {
    if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      console.log('[PumpFun] Maximum reconnection attempts reached');
      useTokenStore.getState().setError('Maximum reconnection attempts reached');
      return;
    }

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    this.reconnectAttempts++;
    const delay = RECONNECT_DELAY * Math.pow(2, this.reconnectAttempts - 1);

    console.log(`[PumpFun] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
    this.reconnectTimeout = setTimeout(() => {
      if (!this.isConnecting) {
        this.connect();
      }
    }, delay);
  }

  disconnect() {
    console.log('[PumpFun] Disconnecting...');

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }

    this.cleanup();
  }
}

export const pumpFunSocket = new PumpFunWebSocket();
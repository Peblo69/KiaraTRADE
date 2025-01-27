// client/src/lib/websocket-manager.ts
import { format } from 'date-fns';
import { usePumpPortalStore } from './pump-portal-websocket';

function getUTCDateTime() {
  const now = new Date();
  return format(now, "yyyy-MM-dd HH:mm:ss");
}

class WebSocketManager {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 5;
  private readonly reconnectDelay = 5000;
  private isConnecting = false;

  constructor(private readonly wsUrl: string) {}

  connect() {
    if (this.ws?.readyState === WebSocket.OPEN || this.isConnecting) {
      console.log('[WebSocket] Connection already exists or is connecting');
      return;
    }

    this.isConnecting = true;
    console.log('[WebSocket] Initiating connection...');

    try {
      this.ws = new WebSocket(this.wsUrl);
      this.setupEventHandlers();
    } catch (error) {
      console.error('[WebSocket] Connection error:', error);
      this.handleConnectionFailure();
    }
  }

  private setupEventHandlers() {
    if (!this.ws) return;

    this.ws.onopen = () => {
      console.log('[WebSocket] Connected successfully');
      this.isConnecting = false;
      this.reconnectAttempts = 0;
      usePumpPortalStore.getState().setConnected(true);
      this.updateCurrentTime();
    };

    this.ws.onclose = () => {
      console.log('[WebSocket] Connection closed');
      usePumpPortalStore.getState().setConnected(false);
      this.handleConnectionFailure();
    };

    this.ws.onerror = (error) => {
      console.error('[WebSocket] Error:', error);
      this.handleConnectionFailure();
    };

    this.ws.onmessage = this.handleMessage;
  }

  private updateCurrentTime() {
    usePumpPortalStore.getState().updateTimestamp();
  }

  private handleMessage = (event: MessageEvent) => {
    try {
      const data = JSON.parse(event.data);
      const store = usePumpPortalStore.getState();

      this.updateCurrentTime();

      switch (data.type) {
        case 'token':
          store.addToken({
            ...data.payload,
            lastAnalyzedAt: store.currentTime,
            analyzedBy: store.currentUser
          });
          break;

        case 'trade':
          if (data.payload.mint) {
            store.addTradeToHistory(data.payload.mint, {
              ...data.payload,
              timestamp: Date.now()
            });
          }
          break;

        case 'sol_price':
          store.setSolPrice(data.payload.price);
          break;

        default:
          console.warn('[WebSocket] Unknown message type:', data.type);
      }
    } catch (error) {
      console.error('[WebSocket] Error processing message:', error);
    }
  };

  private handleConnectionFailure() {
    this.isConnecting = false;

    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`[WebSocket] Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);

      setTimeout(() => {
        this.connect();
      }, this.reconnectDelay);
    } else {
      console.error('[WebSocket] Max reconnection attempts reached');
      usePumpPortalStore.getState().setConnected(false);
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnecting = false;
    usePumpPortalStore.getState().setConnected(false);
  }
}

export const wsManager = new WebSocketManager(process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3000/ws');

export function useWebSocket() {
  const isConnected = usePumpPortalStore(state => state.isConnected);

  return {
    isConnected,
    connect: () => wsManager.connect(),
    disconnect: () => wsManager.disconnect()
  };
}
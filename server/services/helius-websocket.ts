import WebSocket from 'ws';
import { wsManager } from './websocket';

class HeliusWebSocketManager {
  private ws: WebSocket | null = null;
  private subscriptions: Map<string, number> = new Map(); // token address -> subscription id
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private readonly MAX_RECONNECT_ATTEMPTS = 5;
  private readonly RECONNECT_DELAY = 5000;

  constructor() {
    if (!process.env.HELIUS_API_KEY) {
      console.error('[Helius WebSocket] Missing HELIUS_API_KEY');
      return;
    }
  }

  connect() {
    if (this.ws?.readyState === WebSocket.OPEN) {
      console.log('[Helius WebSocket] Already connected');
      return;
    }

    try {
      console.log('[Helius WebSocket] Connecting...');
      // Updated WebSocket URL to use the correct Helius WebSocket endpoint
      this.ws = new WebSocket(`wss://rpc.helius.xyz/?api-key=${process.env.HELIUS_API_KEY}`);

      this.ws.on('open', () => {
        console.log('[Helius WebSocket] Connected');
        this.reconnectAttempts = 0;
        this.resubscribeAll();
      });

      this.ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          if (message.method === 'logsNotification') {
            this.handleLogNotification(message.params);
          }
        } catch (error) {
          console.error('[Helius WebSocket] Error processing message:', error);
        }
      });

      this.ws.on('close', () => {
        console.log('[Helius WebSocket] Connection closed');
        this.reconnect();
      });

      this.ws.on('error', (error) => {
        console.error('[Helius WebSocket] Connection error:', error);
        this.reconnect();
      });

    } catch (error) {
      console.error('[Helius WebSocket] Connection failed:', error);
      this.reconnect();
    }
  }

  private async subscribeToToken(tokenAddress: string) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('[Helius WebSocket] Cannot subscribe, connection not ready');
      return;
    }

    try {
      const subscriptionMessage = {
        jsonrpc: '2.0',
        id: Date.now(),
        method: 'logsSubscribe',
        params: [
          {
            mentions: [tokenAddress]
          },
          {
            commitment: 'confirmed'
          }
        ]
      };

      this.ws.send(JSON.stringify(subscriptionMessage));
      console.log(`[Helius WebSocket] Subscribed to token: ${tokenAddress}`);

    } catch (error) {
      console.error(`[Helius WebSocket] Subscription error for ${tokenAddress}:`, error);
    }
  }

  private handleLogNotification(params: any) {
    try {
      // Extract relevant data from the log
      const { result } = params;
      if (!result) return;

      // Broadcast the token activity to connected clients
      wsManager.broadcast({
        type: 'token_activity',
        data: {
          timestamp: Date.now(),
          ...result
        }
      });

    } catch (error) {
      console.error('[Helius WebSocket] Error handling notification:', error);
    }
  }

  private resubscribeAll() {
    console.log('[Helius WebSocket] Resubscribing to all tokens...');
    this.subscriptions.forEach((_, address) => {
      this.subscribeToToken(address);
    });
  }

  private reconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.reconnectAttempts >= this.MAX_RECONNECT_ATTEMPTS) {
      console.error('[Helius WebSocket] Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.RECONNECT_DELAY * Math.pow(2, this.reconnectAttempts - 1);
    console.log(`[Helius WebSocket] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

    this.reconnectTimeout = setTimeout(() => {
      this.connect();
    }, delay);
  }

  // Public method to add new token subscription
  addToken(tokenAddress: string) {
    if (!this.subscriptions.has(tokenAddress)) {
      this.subscriptions.set(tokenAddress, Date.now());
      this.subscribeToToken(tokenAddress);
    }
  }

  // Initialize the connection
  initialize() {
    console.log('[Helius WebSocket] Initializing...');
    this.connect();
  }
}

export const heliusWsManager = new HeliusWebSocketManager();
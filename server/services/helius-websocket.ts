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
    console.log('[Helius WebSocket] API Key available:', !!process.env.HELIUS_API_KEY);
  }

  connect() {
    if (this.ws?.readyState === WebSocket.OPEN) {
      console.log('[Helius WebSocket] Already connected');
      return;
    }

    try {
      console.log('[Helius WebSocket] Attempting to connect...');
      const wsUrl = `wss://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`;
      console.log(`[Helius WebSocket] Connecting to: ${wsUrl}`);

      this.ws = new WebSocket(wsUrl);

      this.ws.on('open', () => {
        console.log('[Helius WebSocket] Connected successfully');
        this.reconnectAttempts = 0;
        this.resubscribeAll();
      });

      this.ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          console.log('[Helius WebSocket] Message received:', message);

          if (message.method === 'logsNotification') {
            this.handleLogNotification(message.params);
          }
        } catch (error) {
          console.error('[Helius WebSocket] Error processing message:', error);
        }
      });

      this.ws.on('close', (event) => {
        const closeReason = event.reason || 'No reason provided';
        console.log(`[Helius WebSocket] Connection closed (${event.code}): ${closeReason}`);

        // Special handling for rejection codes
        if (event.code === 1008 || event.code === 1011) {
          console.error('[Helius WebSocket] Server rejected connection, extending delay before retry');
          this.reconnectAttempts = this.MAX_RECONNECT_ATTEMPTS; // Force maximum delay
          return;
        }

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

      console.log(`[Helius WebSocket] Sending subscription for token: ${tokenAddress}`, subscriptionMessage);
      this.ws.send(JSON.stringify(subscriptionMessage));
      console.log(`[Helius WebSocket] Subscription sent for token: ${tokenAddress}`);

    } catch (error) {
      console.error(`[Helius WebSocket] Subscription error for ${tokenAddress}:`, error);
    }
  }

  private handleLogNotification(params: any) {
    try {
      console.log('[Helius WebSocket] Log notification received:', params);

      const { result } = params;
      if (!result) {
        console.warn('[Helius WebSocket] Empty result in notification');
        return;
      }

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
      console.log(`[Helius WebSocket] Resubscribing to token: ${address}`);
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
    console.log(`[Helius WebSocket] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.MAX_RECONNECT_ATTEMPTS})`);

    this.reconnectTimeout = setTimeout(() => {
      this.connect();
    }, delay);
  }

  // Public method to add new token subscription
  addToken(tokenAddress: string) {
    if (!this.subscriptions.has(tokenAddress)) {
      console.log(`[Helius WebSocket] Adding new token subscription: ${tokenAddress}`);
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
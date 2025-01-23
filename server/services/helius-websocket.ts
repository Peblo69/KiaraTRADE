import WebSocket from 'ws';
import { wsManager } from './websocket';
import logger from './logger';

class HeliusWebSocketManager {
  private ws: WebSocket | null = null;
  private subscriptions: Map<string, number> = new Map(); // token address -> subscription id
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private readonly MAX_RECONNECT_ATTEMPTS = 5;
  private readonly RECONNECT_DELAY = 5000;
  private initialized = false;

  constructor() {
    this.validateApiKey();
  }

  private validateApiKey() {
    if (!process.env.HELIUS_API_KEY) {
      const error = new Error('[Helius WebSocket] HELIUS_API_KEY environment variable is not set');
      logger.error(error.message);
      throw error;
    }

    if (typeof process.env.HELIUS_API_KEY !== 'string' || process.env.HELIUS_API_KEY.length < 10) {
      const error = new Error('[Helius WebSocket] HELIUS_API_KEY appears to be invalid');
      logger.error(error.message);
      throw error;
    }

    logger.info('[Helius WebSocket] API Key validation successful');
  }

  connect() {
    if (!process.env.HELIUS_API_KEY) {
      logger.error('[Helius WebSocket] Cannot connect: HELIUS_API_KEY is not set');
      return;
    }

    if (this.ws?.readyState === WebSocket.OPEN) {
      logger.info('[Helius WebSocket] Already connected');
      return;
    }

    try {
      logger.info('[Helius WebSocket] Attempting to connect...');
      const wsUrl = `wss://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`;
      logger.info(`[Helius WebSocket] Connecting to: ${wsUrl}`);

      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        logger.info('[Helius WebSocket] Connected successfully');
        this.reconnectAttempts = 0;
        this.resubscribeAll();
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data.toString());
          logger.debug('[Helius WebSocket] Message received:', message);

          if (message.method === 'logsNotification') {
            this.handleLogNotification(message.params);
          }
        } catch (error) {
          logger.error('[Helius WebSocket] Error processing message:', error);
        }
      };

      this.ws.onclose = (code: number) => {
        logger.warn(`[Helius WebSocket] Connection closed with code: ${code}`);

        // Special handling for rejection codes
        if (code === 1008 || code === 1011) {
          logger.error('[Helius WebSocket] Server rejected connection, extending delay before retry');
          this.reconnectAttempts = this.MAX_RECONNECT_ATTEMPTS; // Force maximum delay
          return;
        }

        this.reconnect();
      };

      this.ws.onerror = (error) => {
        logger.error('[Helius WebSocket] Connection error:', error);
        this.reconnect();
      };

    } catch (error) {
      logger.error('[Helius WebSocket] Connection failed:', error);
      this.reconnect();
    }
  }

  private async subscribeToToken(tokenAddress: string) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      logger.warn('[Helius WebSocket] Cannot subscribe, connection not ready');
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

      logger.info(`[Helius WebSocket] Sending subscription for token: ${tokenAddress}`);
      this.ws.send(JSON.stringify(subscriptionMessage));
      logger.info(`[Helius WebSocket] Subscription sent for token: ${tokenAddress}`);

    } catch (error) {
      logger.error(`[Helius WebSocket] Subscription error for ${tokenAddress}:`, error);
    }
  }

  private handleLogNotification(params: any) {
    try {
      logger.debug('[Helius WebSocket] Log notification received:', params);

      const { result } = params;
      if (!result) {
        logger.warn('[Helius WebSocket] Empty result in notification');
        return;
      }

      // Broadcast using PumpPortal's broadcast mechanism
      wsManager.broadcast({
        type: 'token_activity',
        data: {
          timestamp: Date.now(),
          ...result
        }
      });

    } catch (error) {
      logger.error('[Helius WebSocket] Error handling notification:', error);
    }
  }

  private resubscribeAll() {
    logger.info('[Helius WebSocket] Resubscribing to all tokens...');
    this.subscriptions.forEach((_, address) => {
      logger.info(`[Helius WebSocket] Resubscribing to token: ${address}`);
      this.subscribeToToken(address);
    });
  }

  private reconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.reconnectAttempts >= this.MAX_RECONNECT_ATTEMPTS) {
      logger.error('[Helius WebSocket] Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.RECONNECT_DELAY * Math.pow(2, this.reconnectAttempts - 1);
    logger.info(`[Helius WebSocket] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.MAX_RECONNECT_ATTEMPTS})`);

    this.reconnectTimeout = setTimeout(() => {
      this.connect();
    }, delay);
  }

  // Public method to add new token subscription
  addToken(tokenAddress: string) {
    if (!this.subscriptions.has(tokenAddress)) {
      logger.info(`[Helius WebSocket] Adding new token subscription: ${tokenAddress}`);
      this.subscriptions.set(tokenAddress, Date.now());
      this.subscribeToToken(tokenAddress);
    }
  }

  // Initialize the connection
  initialize() {
    if (this.initialized) {
      logger.info('[Helius WebSocket] Already initialized');
      return;
    }

    try {
      logger.info('[Helius WebSocket] Initializing...');
      this.validateApiKey();
      this.connect();
      this.initialized = true;
    } catch (error) {
      logger.error('[Helius WebSocket] Failed to initialize:', error);
      throw error; // Re-throw to prevent silent failure
    }
  }
}

export const heliusWsManager = new HeliusWebSocketManager();
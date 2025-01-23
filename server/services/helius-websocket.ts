import WebSocket from 'ws';
import { wsManager } from './websocket';
import { tokenMetricsService } from './token-metrics';

interface TokenMetrics {
  price: number;
  marketCap: number;
  volume24h: number;
  lastUpdate: number;
}

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
      console.error('[Helius] HELIUS_API_KEY environment variable is not set');
      throw new Error('HELIUS_API_KEY not set');
    }

    if (typeof process.env.HELIUS_API_KEY !== 'string' || process.env.HELIUS_API_KEY.length < 10) {
      console.error('[Helius] HELIUS_API_KEY appears to be invalid');
      throw new Error('Invalid HELIUS_API_KEY');
    }

    console.log('[Helius] API Key validation successful');
  }

  private handleLogNotification(params: any) {
    try {
      console.log('[Helius] Log notification received:', params);

      const { result } = params;
      if (!result) {
        console.warn('[Helius] Empty result in notification');
        return;
      }

      // Extract token transfer information
      const transfer = result.instructions?.find((instr: any) =>
        instr.program === 'spl-token' && instr.data.includes('Transfer')
      );

      if (transfer) {
        console.log('[Helius] Token transfer detected:', transfer);
        // Process the transaction with our metrics service
        tokenMetricsService.processTransaction(transfer);
      }

    } catch (error) {
      console.error('[Helius] Error handling notification:', error);
    }
  }

  connect() {
    if (!process.env.HELIUS_API_KEY) {
      console.error('[Helius] Cannot connect: HELIUS_API_KEY is not set');
      return;
    }

    if (this.ws?.readyState === WebSocket.OPEN) {
      console.log('[Helius] Already connected');
      return;
    }

    try {
      console.log('[Helius] Attempting to connect...');
      const wsUrl = `wss://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`;
      console.log(`[Helius] Connecting to: ${wsUrl}`);

      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('[Helius] Connected successfully');
        this.reconnectAttempts = 0;
        this.resubscribeAll();
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data.toString());
          console.log('[Helius] Message received:', message);

          if (message.method === 'logsNotification') {
            this.handleLogNotification(message.params);
          }
        } catch (error) {
          console.error('[Helius] Error processing message:', error);
        }
      };

      this.ws.onclose = (event) => {
        console.warn(`[Helius] Connection closed with code ${event.code}`);

        // Special handling for rejection codes
        if (event.code === 1008 || event.code === 1011) {
          console.error('[Helius] Server rejected connection, extending delay before retry');
          this.reconnectAttempts = this.MAX_RECONNECT_ATTEMPTS;
          return;
        }

        this.reconnect();
      };

      this.ws.onerror = (error) => {
        console.error('[Helius] Connection error:', error);
        this.reconnect();
      };

    } catch (error) {
      console.error('[Helius] Connection failed:', error);
      this.reconnect();
    }
  }

  private async subscribeToToken(tokenAddress: string) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('[Helius] Cannot subscribe, connection not ready');
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

      console.log(`[Helius] Sending subscription for token: ${tokenAddress}`);
      this.ws.send(JSON.stringify(subscriptionMessage));
      console.log(`[Helius] Subscription sent for token: ${tokenAddress}`);

    } catch (error) {
      console.error(`[Helius] Subscription error for ${tokenAddress}:`, error);
    }
  }

  private resubscribeAll() {
    console.log('[Helius] Resubscribing to all tokens...');
    this.subscriptions.forEach((_, address) => {
      console.log(`[Helius] Resubscribing to token: ${address}`);
      this.subscribeToToken(address);
    });
  }

  private reconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.reconnectAttempts >= this.MAX_RECONNECT_ATTEMPTS) {
      console.error('[Helius] Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.RECONNECT_DELAY * Math.pow(2, this.reconnectAttempts - 1);
    console.log(`[Helius] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

    this.reconnectTimeout = setTimeout(() => {
      this.connect();
    }, delay);
  }

  addToken(tokenAddress: string) {
    if (!this.subscriptions.has(tokenAddress)) {
      console.log(`[Helius] Adding new token subscription: ${tokenAddress}`);
      this.subscriptions.set(tokenAddress, Date.now());
      this.subscribeToToken(tokenAddress);
    }
  }

  initialize() {
    if (this.initialized) {
      console.log('[Helius] Already initialized');
      return;
    }

    try {
      console.log('[Helius] Initializing...');
      this.validateApiKey();
      this.connect();
      this.initialized = true;
    } catch (error) {
      console.error('[Helius] Failed to initialize:', error);
      throw error;
    }
  }
}

export const heliusWsManager = new HeliusWebSocketManager();
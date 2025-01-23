// Updated Helius WebSocket Integration
import { wsManager } from './websocket';

interface TokenMetrics {
  price: number;          // Current token price
  marketCap: number;      // Market cap calculation
  volume24h: number;      // 24-hour trading volume
  buyCount24h: number;    // Number of buy transactions
  sellCount24h: number;   // Number of sell transactions
  lastUpdate: number;     // Timestamp of last update
}

class HeliusWebSocketManager {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private readonly MAX_RECONNECT_ATTEMPTS = 5;
  private readonly RECONNECT_DELAY = 5000;
  private tokenMetrics: Map<string, TokenMetrics> = new Map();

  constructor() {
    this.connect();
  }

  private connect() {
    if (this.ws?.readyState === WebSocket.OPEN) {
      console.log('[Helius] WebSocket already connected');
      return;
    }

    try {
      console.log('[Helius] Connecting to WebSocket...');
      this.ws = new WebSocket('wss://mainnet.helius-rpc.com/?api-key=004f9b13-f526-4952-9998-52f5c7bec6ee');

      this.ws.onopen = () => {
        console.log('[Helius] Connected successfully');
        this.reconnectAttempts = 0;
        this.subscribeToAllTokens();
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.method === 'logsNotification') {
            console.log('[Helius] Logs notification received:', data.params);
            this.processNotification(data.params);
          }
        } catch (error) {
          console.error('[Helius] Error processing message:', error);
        }
      };

      this.ws.onclose = () => {
        console.log('[Helius] WebSocket connection closed');
        this.reconnect();
      };

      this.ws.onerror = (error) => {
        console.error('[Helius] WebSocket error:', error);
        this.reconnect();
      };

    } catch (error) {
      console.error('[Helius] Connection failed:', error);
      this.reconnect();
    }
  }

  private reconnect() {
    if (this.reconnectAttempts >= this.MAX_RECONNECT_ATTEMPTS) {
      console.error('[Helius] Max reconnect attempts reached');
      return;
    }

    this.reconnectAttempts++;
    console.log(`[Helius] Reconnecting in ${this.RECONNECT_DELAY}ms (Attempt ${this.reconnectAttempts})`);
    setTimeout(() => this.connect(), this.RECONNECT_DELAY);
  }

  private subscribeToAllTokens() {
    const tokens = Array.from(this.tokenMetrics.keys());
    tokens.forEach((token) => this.subscribeToToken(token));
  }

  private subscribeToToken(tokenAddress: string) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('[Helius] WebSocket not ready for subscription');
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
      console.log(`[Helius] Subscribed to token: ${tokenAddress}`);

    } catch (error) {
      console.error(`[Helius] Subscription error for ${tokenAddress}:`, error);
    }
  }

  private processNotification(params: any) {
    const { result } = params;
    if (!result) return;

    // Process token-specific activity
    const tokenAddress = result.value?.mint;
    const transactionType = this.determineTransactionType(result);
    const amount = parseFloat(result.value?.amount || 0);

    if (!tokenAddress) return;

    let metrics = this.tokenMetrics.get(tokenAddress) || this.initializeTokenMetrics(tokenAddress);

    // Update metrics
    if (transactionType === 'buy') metrics.buyCount24h++;
    if (transactionType === 'sell') metrics.sellCount24h++;
    metrics.volume24h += amount;
    metrics.lastUpdate = Date.now();

    // Broadcast updates
    this.broadcastMetrics(tokenAddress, metrics);
  }

  private determineTransactionType(data: any): 'buy' | 'sell' | 'unknown' {
    const { source, destination } = data.value || {};
    if (source?.includes('pool')) return 'sell';
    if (destination?.includes('pool')) return 'buy';
    return 'unknown';
  }

  private initializeTokenMetrics(tokenAddress: string): TokenMetrics {
    const initialMetrics: TokenMetrics = {
      price: 0,
      marketCap: 0,
      volume24h: 0,
      buyCount24h: 0,
      sellCount24h: 0,
      lastUpdate: Date.now()
    };
    this.tokenMetrics.set(tokenAddress, initialMetrics);
    return initialMetrics;
  }

  private broadcastMetrics(tokenAddress: string, metrics: TokenMetrics) {
    wsManager.broadcast({
      type: 'token_metrics_update',
      data: {
        tokenAddress,
        ...metrics
      }
    });
    console.log(`[Helius] Metrics broadcasted for ${tokenAddress}`);
  }
}

export const heliusWebSocketManager = new HeliusWebSocketManager();

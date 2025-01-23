import { wsManager } from './websocket';
import { useTokenStore } from './websocket';

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
  private heliusWs: WebSocket | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private readonly MAX_RECONNECT_ATTEMPTS = 5;
  private readonly RECONNECT_DELAY = 5000;
  private isConnecting = false;
  private isReconnecting = false;
  private isManualDisconnect = false;

  private async connectHelius() {
    try {
      if (this.heliusWs?.readyState === WebSocket.OPEN) {
        console.log('[Helius] Already connected');
        return;
      }

      console.log('[Helius] Attempting to connect...');
      const wsUrl = 'wss://mainnet.helius-rpc.com/?api-key=004f9b13-f526-4952-9998-52f5c7bec6ee';
      console.log('[Helius] Connecting to:', wsUrl);

      this.heliusWs = new WebSocket(wsUrl);

      this.heliusWs.onopen = () => {
        console.log('[Helius] Connected successfully');
        console.log('[Helius] WebSocket State:', this.heliusWs?.readyState);
        this.resubscribeTokens();
      };

      this.heliusWs.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('[Helius] Raw message received:', data);

          if (data.method === 'logsNotification') {
            console.log('[Helius] Logs notification received:', data.params);
            this.handleHeliusNotification(data.params);
          }
        } catch (error) {
          console.error('[Helius] Error processing message:', error);
        }
      };

      this.heliusWs.onclose = (event) => {
        console.log('[Helius] Connection closed:', event.code, event.reason);
        setTimeout(() => this.connectHelius(), 5000);
      };

      this.heliusWs.onerror = (error) => {
        console.error('[Helius] Connection error:', error);
      };

    } catch (error) {
      console.error('[Helius] Failed to establish connection:', error);
    }
  }

  private handleHeliusNotification(params: any) {
    try {
      if (!params || !params.result) {
        console.log('[Helius] Empty notification received');
        return;
      }

      console.log('[Helius] Processing notification:', params);

      // Process the notification here
      const result = params.result;
      if (result.value && result.value.logs) {
        console.log('[Helius] Transaction logs:', result.value.logs);
      }
    } catch (error) {
      console.error('[Helius] Error handling notification:', error);
    }
  }

  private resubscribeTokens() {
    const store = useTokenStore.getState();
    store.tokens.forEach(token => {
      this.subscribeToHelius(token.address);
    });
  }

  private subscribeToHelius(tokenAddress: string) {
    if (!this.heliusWs || this.heliusWs.readyState !== WebSocket.OPEN) {
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

      console.log('[Helius] Subscribing to token:', tokenAddress);
      console.log('[Helius] Subscription message:', subscriptionMessage);

      this.heliusWs.send(JSON.stringify(subscriptionMessage));
    } catch (error) {
      console.error('[Helius] Subscription error:', error);
    }
  }

  connect() {
    if (this.ws?.readyState === WebSocket.OPEN) {
      console.log('[PumpPortal] Already connected');
      return;
    }

    if (this.isConnecting || this.isReconnecting) {
      console.log('[PumpPortal] Connection attempt already in progress');
      return;
    }

    try {
      this.isConnecting = true;
      this.isManualDisconnect = false;
      console.log('[PumpPortal] Attempting to connect...');

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}`;
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('[PumpPortal] Connected successfully');
        this.isConnecting = false;
        this.isReconnecting = false;
        this.reconnectAttempts = 0;
        this.startHeartbeat();
        useTokenStore.getState().setConnected(true);

        // Connect to Helius after PumpPortal connection is established
        this.connectHelius();
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'connection_status') {
            const store = useTokenStore.getState();
            if (store.isConnected !== (data.status === 'connected')) {
              store.setConnected(data.status === 'connected');
            }
            return;
          }

          if (data.type === 'token' && data.data) {
            this.handleTokenUpdate(data.data);
          }
        } catch (error) {
          console.error('[PumpPortal] Error processing message:', error);
        }
      };

      this.ws.onclose = () => {
        console.log('[PumpPortal] Connection closed');
        this.cleanup();

        if (!this.isManualDisconnect) {
          this.reconnect();
        }
      };

      this.ws.onerror = (error) => {
        console.error('[PumpPortal] Connection error:', error);
        useTokenStore.getState().setError('WebSocket connection error');
        this.cleanup();

        if (!this.isManualDisconnect) {
          this.reconnect();
        }
      };

    } catch (error) {
      console.error('[PumpPortal] Failed to establish connection:', error);
      useTokenStore.getState().setError('Failed to establish WebSocket connection');
      this.isConnecting = false;
      this.cleanup();

      if (!this.isManualDisconnect) {
        this.reconnect();
      }
    }
  }

  private handleTokenUpdate(token: any) {
    if (!token?.address) {
      console.warn('[PumpPortal] Received invalid token data');
      return;
    }

    const store = useTokenStore.getState();

    const processedToken = {
      ...token,
      lastUpdate: Date.now(),
      source: token.source || 'pumpportal',
      isActive: true,
    };

    const existingToken = store.tokens.find(t => t.address === token.address);
    if (!existingToken ||
        existingToken.price !== token.price ||
        existingToken.marketCapSol !== token.marketCapSol ||
        existingToken.volume24h !== token.volume24h) {

      if (!existingToken) {
        this.subscribeToHelius(token.address);
      }

      store.addToken(processedToken);
    }
  }

  private startHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.heartbeatInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        try {
          this.ws.send(JSON.stringify({ type: 'ping' }));
        } catch (error) {
          console.error('[PumpPortal] Error sending heartbeat:', error);
        }
      }
    }, 30000);
  }

  private cleanup() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    if (this.ws) {
      try {
        this.ws.close();
      } catch (error) {
        console.error('[PumpPortal] Error closing WebSocket:', error);
      }
      this.ws = null;
    }

    useTokenStore.getState().setConnected(false);
  }

  private reconnect() {
    if (this.isReconnecting) return;

    this.isReconnecting = true;
    this.reconnectAttempts++;

    if (this.reconnectAttempts <= this.MAX_RECONNECT_ATTEMPTS) {
      const delay = this.RECONNECT_DELAY * Math.pow(2, this.reconnectAttempts - 1);
      console.log(`[PumpPortal] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

      setTimeout(() => {
        this.isReconnecting = false;
        this.connect();
      }, delay);
    } else {
      console.error('[PumpPortal] Max reconnection attempts reached');
      this.isReconnecting = false;
    }
  }

  disconnect() {
    this.isManualDisconnect = true;
    this.cleanup();
  }
}

export const unifiedWebSocketManager = new HeliusWebSocketManager();
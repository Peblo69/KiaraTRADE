import { format } from 'date-fns';
import { usePumpPortalStore } from './pump-portal-websocket';
import { calculatePumpFunTokenMetrics } from '@/utils/token-calculations';

// Debug & Constants
const DEBUG = true;
const WS_URL = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`;
const UTC_DATE_FORMAT = "yyyy-MM-dd HH:mm:ss";
const CURRENT_USER = 'Peblo69';
const RECONNECT_DELAY = 5000;
const MAX_RECONNECT_ATTEMPTS = 5;
const HEARTBEAT_INTERVAL = 30000;
const BATCH_INTERVAL = 1000; // 1 second batching interval
const BINANCE_SOL_PRICE_URL = 'https://api.binance.com/api/v3/ticker/price?symbol=SOLUSDT';

interface PendingUpdate {
  type: string;
  data: any;
}

let pendingUpdates: PendingUpdate[] = [];
let batchTimeout: NodeJS.Timeout | null = null;

class WebSocketManager {
  private ws: WebSocket | null = null;
  private reconnectAttempts: number = 0;
  private heartbeatInterval: number | null = null;
  private reconnectTimeout: number | null = null;
  private solPrice: number = 0;
  private solPriceInterval: number | null = null;
  private initialized: boolean = false;

  public connect(): void {
    if (this.initialized) {
      console.log('🔄 WebSocket already initialized, skipping...');
      return;
    }

    try {
      this.ws = new WebSocket(WS_URL);
      this.initialized = true;
      console.log('📡 WebSocket connecting to:', WS_URL);

      this.setupEventListeners();
      this.startHeartbeat();
      this.startSolPriceUpdates();

      const currentTime = format(new Date(), UTC_DATE_FORMAT);
      usePumpPortalStore.setState({
        currentTime,
        currentUser: CURRENT_USER
      });
    } catch (error) {
      console.error('💀 Connection error:', error);
      this.updateConnectionStatus(false);
    }
  }

  private async updateSolPrice(): Promise<void> {
    try {
      const response = await fetch(BINANCE_SOL_PRICE_URL);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const data = await response.json();
      if (data && data.price) {
        this.solPrice = parseFloat(data.price);
        console.log('💰 Updated SOL price:', this.solPrice);
        const store = usePumpPortalStore.getState();
        store.setSolPrice(this.solPrice);
        await this.updateAllTokenPrices();
      }
    } catch (error) {
      console.error('❌ SOL price fetch failed:', error);
    }
  }

  private startSolPriceUpdates(): void {
    this.updateSolPrice();
    this.solPriceInterval = window.setInterval(() => {
      this.updateSolPrice();
    }, 30000); // Update every 30 seconds
  }

  private async updateAllTokenPrices(): Promise<void> {
    const store = usePumpPortalStore.getState();
    console.log('🔄 Updating all token prices with SOL:', this.solPrice);

    const updates = store.tokens.map(async (token) => {
      if (token.vTokensInBondingCurve && token.vSolInBondingCurve) {
        const metrics = calculatePumpFunTokenMetrics({
          vSolInBondingCurve: token.vSolInBondingCurve,
          vTokensInBondingCurve: token.vTokensInBondingCurve,
          solPrice: this.solPrice
        });

        store.updateTokenPrice(token.address, metrics.price.usd);
      }
    });

    await Promise.all(updates);
  }

  private setupEventListeners(): void {
    if (!this.ws) return;

    this.ws.onopen = () => {
      console.log('🟢 Connected to WebSocket');
      this.reconnectAttempts = 0;
      this.updateConnectionStatus(true);
    };

    this.ws.onclose = () => {
      console.log('🔴 WebSocket disconnected');
      this.updateConnectionStatus(false);
      this.stopHeartbeat();
      this.attemptReconnect();
    };

    this.ws.onerror = (error) => {
      console.error('⚠️ WebSocket error:', error);
      this.updateConnectionStatus(false);
    };

    this.ws.onmessage = async (event: MessageEvent) => {
      try {
        const message = JSON.parse(event.data);

        if (!message || !message.data) {
          console.warn('⚠️ Invalid message format:', message);
          return;
        }

        // Add to pending updates for batch processing
        pendingUpdates.push({
          type: message.type || 'newToken',
          data: message.data
        });

        // Set up batch processing if not already scheduled
        if (!batchTimeout) {
          batchTimeout = setTimeout(() => {
            this.processPendingUpdates();
          }, BATCH_INTERVAL);
        }
      } catch (error) {
        console.error('❌ Message parsing error:', error);
      }
    };
  }

  private async processPendingUpdates(): Promise<void> {
    if (pendingUpdates.length === 0) return;

    const store = usePumpPortalStore.getState();
    const updates = [...pendingUpdates];
    pendingUpdates = [];
    batchTimeout = null;

    for (const update of updates) {
      const { type, data } = update;

      try {
        switch (type) {
          case 'newToken':
            if (data.mint) {
              console.log('🆕 New token:', data.mint);
              store.addToken(data);
            }
            break;

          case 'trade':
            if (data.mint) {
              console.log('💱 Trade update:', {
                token: data.mint,
                type: data.txType,
                amount: data.solAmount
              });

              const metrics = calculatePumpFunTokenMetrics({
                vSolInBondingCurve: data.vSolInBondingCurve,
                vTokensInBondingCurve: data.vTokensInBondingCurve,
                solPrice: this.solPrice
              });

              // Update token price
              if (metrics.price) {
                store.updateTokenPrice(data.mint, metrics.price.usd);
              }

              // Add trade to history
              store.addTradeToHistory(data.mint, {
                ...data,
                timestamp: Date.now(),
                priceInSol: metrics.price.sol,
                priceInUsd: metrics.price.usd
              });
            }
            break;

          case 'marketData':
            console.log('📊 Market data update');
            // Handle market data updates
            break;

          default:
            console.warn('⚠️ Unknown message type:', type);
        }
      } catch (error) {
        console.error('❌ Error processing update:', { type, error });
      }
    }
  }

  private updateConnectionStatus(isConnected: boolean): void {
    const currentTime = format(new Date(), UTC_DATE_FORMAT);
    console.log('🔌 Connection status:', {
      isConnected,
      time: currentTime,
      user: CURRENT_USER
    });

    usePumpPortalStore.setState({
      isConnected,
      currentTime,
      currentUser: CURRENT_USER
    });
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
      this.reconnectAttempts++;
      console.log(`🔄 Reconnecting (${this.reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`);

      this.reconnectTimeout = window.setTimeout(() => {
        this.connect();
      }, RECONNECT_DELAY * this.reconnectAttempts);
    } else {
      console.error('❌ Max reconnection attempts reached');
      this.updateConnectionStatus(false);
    }
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = window.setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'heartbeat' }));
      }
    }, HEARTBEAT_INTERVAL);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  public disconnect(): void {
    console.log('👋 Disconnecting WebSocket...');
    this.stopHeartbeat();

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.solPriceInterval) {
      clearInterval(this.solPriceInterval);
      this.solPriceInterval = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.initialized = false;
    this.updateConnectionStatus(false);
  }

  public getStatus(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  public sendMessage(message: any): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.error('❌ Cannot send - WebSocket not connected');
    }
  }
}

export const wsManager = new WebSocketManager();

// Make wsManager available globally for debugging
if (typeof window !== 'undefined') {
  (window as any).wsManager = wsManager;
}

export function getCurrentUTCTime(): string {
  return format(new Date(), UTC_DATE_FORMAT);
}

export function getCurrentUser(): string {
  return CURRENT_USER;
}
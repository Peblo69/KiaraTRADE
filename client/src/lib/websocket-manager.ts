import { format } from 'date-fns';
import { usePumpPortalStore } from './pump-portal-websocket';
import { calculatePumpFunTokenMetrics } from '@/utils/token-calculations';

// Debug & Constants
const DEBUG = false; // Disable debug logs to reduce console noise
const WS_URL = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`;
const UTC_DATE_FORMAT = "yyyy-MM-dd HH:mm:ss";
const CURRENT_USER = 'Peblo69';
const RECONNECT_DELAY = 5000;
const MAX_RECONNECT_ATTEMPTS = 5;
const HEARTBEAT_INTERVAL = 30000;
const BATCH_INTERVAL = 1000; // 1 second batching interval
const BINANCE_SOL_PRICE_URL = 'https://api.binance.com/api/v3/ticker/price?symbol=SOLUSDT';

interface PendingUpdate {
  type: 'newToken' | 'trade' | 'marketData';
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
        const store = usePumpPortalStore.getState();
        store.setSolPrice(this.solPrice);
        await this.processPendingUpdates();
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

  private isValidTokenData(data: any): boolean {
    return (
      data &&
      typeof data === 'object' &&
      (data.mint || data.address) &&
      typeof data.vTokensInBondingCurve === 'number' &&
      typeof data.vSolInBondingCurve === 'number'
    );
  }

  private async processPendingUpdates(): Promise<void> {
    if (batchTimeout) {
      clearTimeout(batchTimeout);
      batchTimeout = null;
    }

    if (pendingUpdates.length === 0) return;

    const store = usePumpPortalStore.getState();
    const updates = [...pendingUpdates];
    pendingUpdates = [];

    const processUpdate = async (update: PendingUpdate) => {
      if (!update.data) return;

      switch (update.type) {
        case 'newToken':
          if (this.isValidTokenData(update.data)) {
            store.addToken(update.data);
          }
          break;

        case 'trade':
          if (update.data.mint && this.isValidTokenData(update.data)) {
            const metrics = calculatePumpFunTokenMetrics({
              vSolInBondingCurve: update.data.vSolInBondingCurve,
              vTokensInBondingCurve: update.data.vTokensInBondingCurve,
              solPrice: this.solPrice
            });

            if (metrics.price) {
              store.updateTokenPrice(update.data.mint, metrics.price.usd);
            }
          }
          break;

        case 'marketData':
          // Handle market data updates if needed
          break;
      }
    };

    await Promise.all(updates.map(processUpdate));
  }

  private setupEventListeners(): void {
    if (!this.ws) return;

    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
      this.updateConnectionStatus(true);
    };

    this.ws.onclose = () => {
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
        if (message && message.data) {
          pendingUpdates.push({
            type: message.type || 'newToken',
            data: message.data
          });

          if (!batchTimeout) {
            batchTimeout = setTimeout(() => {
              this.processPendingUpdates();
            }, BATCH_INTERVAL);
          }
        }
      } catch (error) {
        console.error('❌ Message parsing error:', error);
      }
    };
  }

  private updateConnectionStatus(isConnected: boolean): void {
    const currentTime = format(new Date(), UTC_DATE_FORMAT);
    usePumpPortalStore.setState({
      isConnected,
      currentTime,
      currentUser: CURRENT_USER
    });
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
      this.reconnectAttempts++;
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

if (typeof window !== 'undefined') {
  (window as any).wsManager = wsManager;
}

export function getCurrentUTCTime(): string {
  return format(new Date(), UTC_DATE_FORMAT);
}

export function getCurrentUser(): string {
  return CURRENT_USER;
}
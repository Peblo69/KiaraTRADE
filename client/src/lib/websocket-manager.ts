import { format } from 'date-fns';
import { usePumpPortalStore } from './pump-portal-websocket';
import { calculatePumpFunTokenMetrics } from '@/utils/token-calculations';

// Debug & Constants
const DEBUG = true;
const WS_URL = `${import.meta.env.VITE_PUMPPORTAL_WS_URL || 'wss://pumpportal.fun/api/data'}`;
const UTC_DATE_FORMAT = "yyyy-MM-dd HH:mm:ss";
const CURRENT_USER = import.meta.env.VITE_CURRENT_USER || 'Peblo69';
const RECONNECT_DELAY = parseInt(import.meta.env.VITE_WS_RECONNECT_INTERVAL || '5000');
const MAX_RECONNECT_ATTEMPTS = parseInt(import.meta.env.VITE_WS_MAX_RECONNECT_ATTEMPTS || '5');
const HEARTBEAT_INTERVAL = parseInt(import.meta.env.VITE_WS_HEARTBEAT_INTERVAL || '30000');

// Use CoinGecko API instead of Binance to avoid CORS issues
const COINGECKO_SOL_PRICE_URL = 'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd';

console.log('🚀 WebSocket Manager Configuration:', { 
  WS_URL,
  RECONNECT_DELAY,
  MAX_RECONNECT_ATTEMPTS,
  HEARTBEAT_INTERVAL
});

class WebSocketManager {
  private static instance: WebSocketManager;
  private ws: WebSocket | null = null;
  private heartbeatInterval: number | null = null;
  private reconnectAttempts: number = 0;
  private reconnectTimeout: number | null = null;
  private solPrice: number = 0;
  private solPriceInterval: number | null = null;
  private subscriptions: Set<string> = new Set();
  private initialized: boolean = false;

  private constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', this.cleanup.bind(this));
    }
  }

  public static getInstance(): WebSocketManager {
    if (!WebSocketManager.instance) {
      WebSocketManager.instance = new WebSocketManager();
    }
    return WebSocketManager.instance;
  }

  private cleanup(): void {
    console.log('🧹 Cleaning up WebSocket connections...');
    this.disconnect();
    this.initialized = false;
    this.subscriptions.clear();
  }

  public connect(): void {
    if (this.initialized || this.ws?.readyState === WebSocket.CONNECTING) {
      console.log('🔄 WebSocket already initialized or connecting, skipping...');
      return;
    }

    // Check for vite-hmr protocol to avoid duplicate connections
    if (typeof window !== 'undefined') {
      const protocol = window.location.protocol;
      if (protocol === 'ws:' || window.location.pathname.includes('__vite')) {
        console.log('⚠️ Skipping WebSocket connection for vite-hmr');
        return;
      }
    }

    console.log('🔌 Connecting to:', WS_URL);

    try {
      if (this.ws) {
        try {
          this.ws.close(1000, 'Cleanup before new connection');
        } catch (e) {
          console.error('Error closing existing connection:', e);
        }
        this.ws = null;
      }

      this.ws = new WebSocket(WS_URL);
      this.initialized = true;
      this.setupEventListeners();
      this.startHeartbeat();
      this.startSolPriceUpdates();
    } catch (error) {
      console.error('💀 Connection error:', error);
      this.updateConnectionStatus(false);
    }
  }

  private async updateSolPrice(): Promise<void> {
    if (!this.initialized) return;

    try {
      const response = await fetch(COINGECKO_SOL_PRICE_URL);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const data = await response.json();
      if (data?.solana?.usd) {
        this.solPrice = data.solana.usd;
        console.log('💰 Updated SOL price:', this.solPrice);

        const store = usePumpPortalStore.getState();
        console.log('[PumpPortal][setSolPrice]', { price: this.solPrice });
        if (store.setSolPrice) {
          store.setSolPrice(this.solPrice);
          await this.updateAllTokenPrices();
        }
      }
    } catch (error) {
      console.error('❌ SOL price fetch failed:', error);
    }
  }

  private startSolPriceUpdates(): void {
    this.updateSolPrice();

    if (this.solPriceInterval) {
      clearInterval(this.solPriceInterval);
    }

    this.solPriceInterval = window.setInterval(() => {
      this.updateSolPrice();
    }, HEARTBEAT_INTERVAL);
  }

  private setupEventListeners(): void {
    if (!this.ws) return;

    this.ws.onopen = () => {
      console.log('🟢 Connected to WebSocket');
      this.reconnectAttempts = 0;
      this.updateConnectionStatus(true);
      this.subscribeToEvents();
    };

    this.ws.onmessage = this.handleMessage.bind(this);

    this.ws.onclose = (event) => {
      console.log('🔴 WebSocket disconnected', event.code, event.reason);
      this.updateConnectionStatus(false);
      this.stopHeartbeat();

      if (event.code !== 1000 && this.initialized) {
        this.attemptReconnect();
      }
    };

    this.ws.onerror = (error) => {
      console.error('⚠️ WebSocket error:', error);
      this.updateConnectionStatus(false);
    };
  }

  private subscribeToEvents(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const subscriptions = [
      { method: "subscribeNewToken" },
      { method: "subscribeTokenTrades", keys: [] }
    ];

    subscriptions.forEach(sub => {
      if (!this.subscriptions.has(sub.method)) {
        try {
          this.ws?.send(JSON.stringify(sub));
          this.subscriptions.add(sub.method);
          console.log('📩 Subscribed to:', sub.method);
        } catch (error) {
          console.error(`❌ Failed to subscribe to ${sub.method}:`, error);
        }
      }
    });
  }

  private async handleMessage(event: MessageEvent): Promise<void> {
    if (!this.initialized) return;

    try {
      const data = JSON.parse(event.data);
      const store = usePumpPortalStore.getState();

      if (data.message?.includes('Successfully subscribed')) {
        console.log('✅ Subscription confirmed:', data.message);
        return;
      }

      switch (data.type) {
        case 'newToken':
          console.log('🆕 Processing new token:', data.mint);
          if (store.addToken) {
            store.addToken(data);
          }
          break;

        case 'trade':
          if (data.mint) {
            await this.processTradeData(data);
          }
          break;

        case 'heartbeat':
          this.handleHeartbeat();
          break;

        default:
          console.log('📨 Received message:', data.type);
      }
    } catch (error) {
      console.error('❌ Message processing error:', error);
    }
  }

  private async processTradeData(data: any): Promise<void> {
    const store = usePumpPortalStore.getState();
    if (!store.addTradeToHistory) return;

    try {
      const metrics = calculatePumpFunTokenMetrics({
        vSolInBondingCurve: data.vSolInBondingCurve,
        vTokensInBondingCurve: data.vTokensInBondingCurve,
        solPrice: this.solPrice
      });

      const tradeData = {
        ...data,
        timestamp: Date.now(),
        priceInSol: metrics.price.sol,
        priceInUsd: metrics.price.usd,
        isDevTrade: this.isDevWalletTrade(data)
      };

      store.addTradeToHistory(data.mint, tradeData);
      await this.updateTokenPrice(data.mint, metrics);
    } catch (error) {
      console.error('❌ Trade processing error:', error);
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      console.error('❌ Max reconnection attempts reached');
      this.cleanup();
      return;
    }

    this.reconnectAttempts++;
    const delay = RECONNECT_DELAY * Math.pow(2, this.reconnectAttempts - 1);
    console.log(`🔄 Reconnecting in ${delay}ms (${this.reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`);

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    this.reconnectTimeout = window.setTimeout(() => {
      this.connect();
    }, delay);
  }

  private startHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.heartbeatInterval = window.setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'heartbeat' }));
        this.updateTime();
      }
    }, HEARTBEAT_INTERVAL);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private handleHeartbeat(): void {
    this.updateTime();
  }

  private updateTime(): void {
    const store = usePumpPortalStore.getState();
    const currentTime = format(new Date(), UTC_DATE_FORMAT);
    if (store.updateTime) {
      store.updateTime(currentTime);
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
      this.ws.close(1000, 'Normal closure');
      this.ws = null;
    }

    this.updateConnectionStatus(false);
  }

  private updateConnectionStatus(isConnected: boolean): void {
    const currentTime = format(new Date(), UTC_DATE_FORMAT);
    console.log('🔌 Connection status:', {
      isConnected,
      time: currentTime,
      user: CURRENT_USER
    });

    const store = usePumpPortalStore.getState();
    if (store.updateConnectionStatus) {
      store.updateConnectionStatus(isConnected, currentTime, CURRENT_USER);
    }
  }

  private async updateAllTokenPrices(): Promise<void> {
    const store = usePumpPortalStore.getState();
    if (!store.tokens || this.solPrice <= 0) return;

    console.log('🔄 Updating all token prices with SOL:', this.solPrice);

    const updates = store.tokens.map(async (token) => {
      if (token.vTokensInBondingCurve && token.vSolInBondingCurve) {
        const metrics = calculatePumpFunTokenMetrics({
          vSolInBondingCurve: token.vSolInBondingCurve,
          vTokensInBondingCurve: token.vTokensInBondingCurve,
          solPrice: this.solPrice
        });

        if (store.updateTokenPrice) {
          console.log('[PumpPortal][updateTokenPrice]', {
            address: token.address,
            newPriceInUsd: metrics.price.usd
          });
          await this.updateTokenPrice(token.address, metrics);
        }
      }
    });

    await Promise.all(updates);
  }

  private async updateTokenPrice(address: string, metrics: any): Promise<void> {
    const store = usePumpPortalStore.getState();
    if (store.updateTokenPrice) {
      store.updateTokenPrice(address, metrics.price.usd);
    }
  }

  private isDevWalletTrade(tradeData: any): boolean {
    const store = usePumpPortalStore.getState();
    if (!store.getToken) return false;

    const token = store.getToken(tradeData.mint);
    const isDev = token?.devWallet === tradeData.traderPublicKey;

    if (isDev) {
      console.log('👨‍💻 Dev trade detected:', {
        token: tradeData.mint,
        wallet: tradeData.traderPublicKey
      });
    }

    return isDev;
  }

  public getStatus(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  public isInitialized(): boolean {
    return this.initialized;
  }
}

// Export singleton instance
export const wsManager = WebSocketManager.getInstance();

// Global access for debugging
if (typeof window !== 'undefined' && DEBUG) {
  (window as any).wsManager = wsManager;
}

export function getCurrentUTCTime(): string {
  return format(new Date(), UTC_DATE_FORMAT);
}

export function getCurrentUser(): string {
  return CURRENT_USER;
}
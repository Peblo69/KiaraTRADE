import { format } from 'date-fns';
import { usePumpPortalStore, TokenTrade, PumpPortalToken } from './pump-portal-websocket';
import { calculatePumpFunTokenMetrics } from '@/utils/token-calculations';

const WS_URL = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`;
const UTC_DATE_FORMAT = "yyyy-MM-dd HH:mm:ss";
const CURRENT_USER = 'Peblo69';
const RECONNECT_DELAY = 5000;
const MAX_RECONNECT_ATTEMPTS = 5;
const HEARTBEAT_INTERVAL = 30000;
//const BINANCE_SOL_PRICE_URL = 'https://api.binance.com/api/v3/ticker/price?symbol=SOLUSDT';

class WebSocketManager {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private heartbeatInterval: number | null = null;
  private reconnectTimeout: number | null = null;
  private solPrice: number = 0;
  private solPriceInterval: number | null = null;
  private initialized: boolean = false;

  public connect(): void {
    if (this.initialized) return;

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
    } catch {
      this.updateConnectionStatus(false);
    }
  }

  private async updateSolPrice(): Promise<void> {
    try {
      const response = await fetch('/api/sol-price');
      if (!response.ok) throw new Error();

      const data = await response.json();
      if (data?.price) {
        this.solPrice = data.price;
        const store = usePumpPortalStore.getState();
        store.setSolPrice(this.solPrice);
        await this.updateAllTokenPrices();
      }
    } catch {}
  }

  private startSolPriceUpdates(): void {
    this.updateSolPrice();
    this.solPriceInterval = window.setInterval(() => {
      this.updateSolPrice();
    }, 10000);
  }

  private async updateAllTokenPrices(): Promise<void> {
    const store = usePumpPortalStore.getState();
    if (this.solPrice <= 0) return;

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
      this.reconnectAttempts = 0;
      this.updateConnectionStatus(true);
    };

    this.ws.onclose = () => {
      this.updateConnectionStatus(false);
      this.stopHeartbeat();
      this.attemptReconnect();
    };

    this.ws.onerror = () => {
      this.updateConnectionStatus(false);
    };

    this.ws.onmessage = async (event: MessageEvent) => {
      try {
        const message = JSON.parse(event.data);
        await this.handleMessage(message);
      } catch {}
    };
  }

  private async handleMessage(message: WebSocketMessage): Promise<void> {
    const store = usePumpPortalStore.getState();

    switch (message.type) {
      case 'newToken':
        store.addToken(message.data);
        break;

      case 'trade':
        if (message.data?.mint) {
          const metrics = calculatePumpFunTokenMetrics({
            vSolInBondingCurve: message.data.vSolInBondingCurve,
            vTokensInBondingCurve: message.data.vTokensInBondingCurve,
            solPrice: this.solPrice
          });

          const tradeData: TokenTrade = {
            ...message.data,
            timestamp: Date.now(),
            priceInSol: metrics.price.sol,
            priceInUsd: metrics.price.usd,
            isDevTrade: this.isDevWalletTrade(message.data)
          };

          store.addTradeToHistory(message.data.mint, tradeData);
          await this.calculateTokenPrice({
            ...message.data,
            address: message.data.mint
          } as PumpPortalToken);
        }
        break;

      case 'marketData':
      case 'solPriceUpdate':
        if (message.data?.solPrice && this.solPrice <= 0) {
          this.solPrice = message.data.solPrice;
          store.setSolPrice(this.solPrice);
          await this.updateAllTokenPrices();
        }
        break;

      case 'heartbeat':
        this.handleHeartbeat();
        break;
    }
  }

  private isDevWalletTrade(tradeData: any): boolean {
    const store = usePumpPortalStore.getState();
    const token = store.getToken(tradeData.mint);
    return token?.devWallet === tradeData.traderPublicKey;
  }

  private async calculateTokenPrice(token: PumpPortalToken): Promise<void> {
    if (token.vTokensInBondingCurve && token.vSolInBondingCurve) {
      const metrics = calculatePumpFunTokenMetrics({
        vSolInBondingCurve: token.vSolInBondingCurve,
        vTokensInBondingCurve: token.vTokensInBondingCurve,
        solPrice: this.solPrice
      });

      usePumpPortalStore.getState().updateTokenPrice(token.address, metrics.price.usd);
    }
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
      this.updateConnectionStatus(false);
    }
  }

  private startHeartbeat(): void {
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
    usePumpPortalStore.setState({
      currentTime: format(new Date(), UTC_DATE_FORMAT)
    });
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

  public sendMessage(message: WebSocketMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }
}

export const wsManager = new WebSocketManager();

if (typeof window !== 'undefined') {
  window.wsManager = wsManager;
}

export function getCurrentUTCTime(): string {
  return format(new Date(), UTC_DATE_FORMAT);
}

export function getCurrentUser(): string {
  return CURRENT_USER;
}
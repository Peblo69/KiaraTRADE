// client/src/lib/websocket-manager.ts
import { format } from 'date-fns';
import { usePumpPortalStore, TokenTrade, PumpPortalToken } from './pump-portal-websocket';
import { calculatePumpFunTokenMetrics } from '@/utils/token-calculations';

// Debug & Constants
const DEBUG = true;
const WS_URL = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`;
const UTC_DATE_FORMAT = "yyyy-MM-dd HH:mm:ss";
const CURRENT_USER = 'Peblo69';
const RECONNECT_DELAY = 5000;
const MAX_RECONNECT_ATTEMPTS = 5;
const HEARTBEAT_INTERVAL = 30000;
const BILLION = 1_000_000_000;
const SOL_PRICE_UPDATE_INTERVAL = 10000;
// Use Binance's public SOL/USDT endpoint instead of CoinGecko
const BINANCE_SOL_PRICE_URL = 'https://api.binance.com/api/v3/ticker/price?symbol=SOLUSDT';

console.log('🚀 WEBSOCKET MANAGER LOADING', { WS_URL });

interface WebSocketMessage {
  type: string;
  data: any;
}

interface TradeMessage {
  type: 'trade';
  data: {
    signature: string;
    mint: string;
    txType: 'buy' | 'sell';
    tokenAmount: number;
    solAmount: number;
    traderPublicKey: string;
    counterpartyPublicKey: string;
    bondingCurveKey: string;
    vTokensInBondingCurve: number;
    vSolInBondingCurve: number;
    marketCapSol: number;
  };
}

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

    console.log('🔌 Connecting to:', WS_URL);

    try {
      this.ws = new WebSocket(WS_URL);
      this.initialized = true;

      console.log('📡 WebSocket State:', {
        ws: !!this.ws,
        readyState: this.ws?.readyState,
        url: WS_URL
      });

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
      // Binance returns data in the format: { symbol: "SOLUSDT", price: "123.45" }
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
    this.updateSolPrice(); // Initial update
    this.solPriceInterval = window.setInterval(() => {
      this.updateSolPrice();
    }, SOL_PRICE_UPDATE_INTERVAL);
  }

  private async updateAllTokenPrices(): Promise<void> {
    const store = usePumpPortalStore.getState();
    if (this.solPrice <= 0) {
      console.warn('⚠️ Invalid SOL price, skipping updates');
      return;
    }

    console.log('🔄 Updating all token prices with SOL:', this.solPrice);

    const updates = store.tokens.map(async (token) => {
      if (token.vTokensInBondingCurve && token.vSolInBondingCurve) {
        const metrics = calculatePumpFunTokenMetrics({
          vSolInBondingCurve: token.vSolInBondingCurve,
          vTokensInBondingCurve: token.vTokensInBondingCurve,
          solPrice: this.solPrice
        });

        console.log('📊 Token metrics:', {
          token: token.address,
          price: metrics.price,
          marketCap: metrics.marketCap
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
        const message: WebSocketMessage = JSON.parse(event.data);
        await this.handleMessage(message);
      } catch (error) {
        console.error('❌ Message parsing error:', error);
      }
    };
  }

  private messageQueue: WebSocketMessage[] = [];
  private processingTimeout: NodeJS.Timeout | null = null;
  private readonly BATCH_TIMEOUT = 500; // Process messages every 500ms

  private async handleMessage(message: WebSocketMessage): Promise<void> {
    this.messageQueue.push(message);
    
    if (!this.processingTimeout) {
      this.processingTimeout = setTimeout(() => {
        this.processBatchedMessages();
      }, this.BATCH_TIMEOUT);
    }
  }

  private async processBatchedMessages(): Promise<void> {
    const store = usePumpPortalStore.getState();
    const messages = [...this.messageQueue];
    this.messageQueue = [];
    this.processingTimeout = null;

    const newTokens = new Map();
    const trades = new Map();

    for (const message of messages) {
      switch (message.type) {
        case 'newToken':
          newTokens.set(message.data.mint, message.data);
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

          console.log('💱 Trade processed:', {
            token: message.data.mint,
            price: metrics.price,
            type: message.data.txType
          });

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

      default:
        console.warn('⚠️ Unknown message type:', message.type);
    }
  }

  private isDevWalletTrade(tradeData: any): boolean {
    const store = usePumpPortalStore.getState();
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

  private async calculateTokenPrice(token: PumpPortalToken): Promise<void> {
    if (token.vTokensInBondingCurve && token.vSolInBondingCurve) {
      const metrics = calculatePumpFunTokenMetrics({
        vSolInBondingCurve: token.vSolInBondingCurve,
        vTokensInBondingCurve: token.vTokensInBondingCurve,
        solPrice: this.solPrice
      });

      console.log('💰 Price calculated:', {
        token: token.address,
        price: metrics.price,
        marketCap: metrics.marketCap
      });

      usePumpPortalStore.getState().updateTokenPrice(token.address, metrics.price.usd);
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

  public sendMessage(message: WebSocketMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.error('❌ Cannot send - WebSocket not connected');
    }
  }
}

export const wsManager = new WebSocketManager();

// Global access for debugging
declare global {
  interface Window {
    wsManager: WebSocketManager;
  }
}

if (typeof window !== 'undefined') {
  window.wsManager = wsManager;
}

export function getCurrentUTCTime(): string {
  return format(new Date(), UTC_DATE_FORMAT);
}

export function getCurrentUser(): string {
  return CURRENT_USER;
}

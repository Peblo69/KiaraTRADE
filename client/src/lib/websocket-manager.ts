// client/src/lib/websocket-manager.ts
import { format } from 'date-fns';
import { usePumpPortalStore, TokenTrade, PumpPortalToken } from './pump-portal-websocket';

// Force debug mode
const DEBUG = true;
console.log('🚀 WEBSOCKET MANAGER LOADING');

// Constants
const WS_URL = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`;
console.log('🌐 WebSocket URL:', WS_URL);

const UTC_DATE_FORMAT = "yyyy-MM-dd HH:mm:ss";
const CURRENT_USER = 'Peblo69';
const RECONNECT_DELAY = 5000;
const MAX_RECONNECT_ATTEMPTS = 5;
const HEARTBEAT_INTERVAL = 30000;
const BILLION = 1_000_000_000;
const SOL_PRICE_UPDATE_INTERVAL = 10000;
const COINGECKO_PRICE_URL = 'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd';

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

  public connect(): void {
    console.log('🔌 Attempting to connect to:', WS_URL);

    try {
      this.ws = new WebSocket(WS_URL);

      // ADD THIS DEBUG
      console.log('📡 WebSocket State:', {
        ws: !!this.ws,
        readyState: this.ws?.readyState,
        url: WS_URL
      });

      this.setupEventListeners();
      this.startHeartbeat();
      this.startSolPriceUpdates();

      // Force initial state update
      const currentTime = format(new Date(), UTC_DATE_FORMAT);
      console.log('🕒 Setting initial state:', {
        time: currentTime,
        user: CURRENT_USER
      });

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
      console.log('[PumpPortal] Fetching SOL price from CoinGecko...');
      const response = await fetch(COINGECKO_PRICE_URL);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data && data.solana && data.solana.usd) {
        this.solPrice = data.solana.usd;
        console.log('[PumpPortal] Updated SOL price from CoinGecko:', this.solPrice);

        const store = usePumpPortalStore.getState();
        store.setSolPrice(this.solPrice);
        this.updateAllTokenPrices();
      } else {
        console.error('[PumpPortal] Invalid SOL price data from CoinGecko:', data);
      }
    } catch (error) {
      console.error('[PumpPortal] Failed to fetch SOL price from CoinGecko:', error);
      console.log('[PumpPortal] Falling back to Helius price data if available');
    }
  }

  private startSolPriceUpdates(): void {
    console.log('[PumpPortal] Starting SOL price updates from CoinGecko...');
    // Initial update
    this.updateSolPrice();

    // Set up interval
    this.solPriceInterval = window.setInterval(() => {
      this.updateSolPrice();
    }, SOL_PRICE_UPDATE_INTERVAL);
  }

  private updateAllTokenPrices(): void {
    const store = usePumpPortalStore.getState();
    if (this.solPrice <= 0) {
      console.warn('[PumpPortal] Invalid SOL price, skipping token price updates');
      return;
    }

    console.log('[PumpPortal] Updating all token prices with SOL price:', this.solPrice);

    store.tokens.forEach(token => {
      if (token.vTokensInBondingCurve && token.vSolInBondingCurve) {
        const priceInSol = token.vSolInBondingCurve / BILLION;
        const priceInUsd = priceInSol * this.solPrice;

        console.log('[PumpPortal] Token price calculation:', {
          token: token.address,
          priceInSol,
          priceInUsd,
          vTokens: token.vTokensInBondingCurve,
          vSol: token.vSolInBondingCurve
        });

        store.updateTokenPrice(token.address, priceInUsd);
      }
    });
  }

  private setupEventListeners(): void {
    if (!this.ws) return;

    this.ws.onopen = () => {
      console.log('[PumpPortal] Connected');
      this.reconnectAttempts = 0;
      this.updateConnectionStatus(true);
    };

    this.ws.onclose = () => {
      console.log('[PumpPortal] Disconnected');
      this.updateConnectionStatus(false);
      this.stopHeartbeat();
      this.attemptReconnect();
    };

    this.ws.onerror = (error) => {
      console.error('[PumpPortal] WebSocket error:', error);
      this.updateConnectionStatus(false);
    };

    this.ws.onmessage = (event: MessageEvent) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        console.log('[PumpPortal] Received message:', {
          type: message.type,
          data: message.data
        });
        this.handleMessage(message);
      } catch (error) {
        console.error('[PumpPortal] Error parsing message:', error);
      }
    };
  }

  private handleMessage(message: WebSocketMessage): void {
    try {
      const store = usePumpPortalStore.getState();

      switch (message.type) {
        case 'newToken':
          console.log('[PumpPortal] Received new token:', message.data.mint);
          store.addToken(message.data);
          break;

        case 'trade':
          console.log('[PumpPortal] Received trade:', message.data);
          if (message.data && message.data.mint) {
            const priceInSol = message.data.solAmount / BILLION;
            const priceInUsd = priceInSol * this.solPrice;

            console.log('[PumpPortal] Trade price calculation:', {
              token: message.data.mint,
              priceInSol,
              priceInUsd,
              solPrice: this.solPrice
            });

            const tradeData: TokenTrade = {
              ...message.data,
              timestamp: Date.now(),
              priceInSol,
              priceInUsd,
              isDevTrade: this.isDevWalletTrade(message.data)
            };

            if (tradeData.isDevTrade) {
              console.log('[PumpPortal] Dev wallet trade detected:', {
                type: message.data.txType,
                wallet: message.data.traderPublicKey
              });
            }

            store.addTradeToHistory(message.data.mint, tradeData);

            this.calculateTokenPrice({
              ...message.data,
              address: message.data.mint
            } as PumpPortalToken);
          }
          break;

        case 'connection_status':
          if (message.data && typeof message.data.connected === 'boolean') {
            store.setConnected(message.data.connected);
          }
          break;

        case 'heartbeat':
          this.handleHeartbeat();
          break;

        case 'marketData':
        case 'solPriceUpdate':
          console.log('[PumpPortal] Received market data:', message.data);
          if (message.data && typeof message.data.solPrice === 'number') {
            const heliusPrice = message.data.solPrice;
            console.log('[PumpPortal] Received SOL price from Helius:', heliusPrice);

            // Only update if we don't have a CoinGecko price yet
            if (this.solPrice <= 0) {
              this.solPrice = heliusPrice;
              store.setSolPrice(this.solPrice);
              this.updateAllTokenPrices();
            }
          }
          break;

        default:
          console.warn('[PumpPortal] Unknown message type:', message.type);
      }
    } catch (error) {
      console.error('[PumpPortal] Error handling message:', error);
    }
  }

  private isDevWalletTrade(tradeData: any): boolean {
    const store = usePumpPortalStore.getState();
    const token = store.getToken(tradeData.mint);
    const isDev = token?.devWallet === tradeData.traderPublicKey;

    if (isDev) {
      console.log('[PumpPortal] Dev wallet trade identified:', {
        token: tradeData.mint,
        wallet: tradeData.traderPublicKey
      });
    }

    return isDev;
  }

  private calculateTokenPrice(token: PumpPortalToken): void {
    if (token.vTokensInBondingCurve && token.vSolInBondingCurve) {
      const priceInSol = token.vSolInBondingCurve / BILLION;
      const priceInUsd = priceInSol * this.solPrice;

      console.log('[PumpPortal] Token price calculation:', {
        token: token.address,
        priceInSol,
        priceInUsd,
        solPrice: this.solPrice,
        vTokens: token.vTokensInBondingCurve,
        vSol: token.vSolInBondingCurve
      });

      usePumpPortalStore.getState().updateTokenPrice(token.address, priceInUsd);
    }
  }

  private updateConnectionStatus(isConnected: boolean): void {
    const currentTime = format(new Date(), UTC_DATE_FORMAT);
    console.log('[PumpPortal] Updating connection status:', {
      isConnected,
      currentTime,
      currentUser: CURRENT_USER
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
      console.log(`[PumpPortal] Reconnecting... Attempt ${this.reconnectAttempts}`);

      this.reconnectTimeout = window.setTimeout(() => {
        this.connect();
      }, RECONNECT_DELAY * this.reconnectAttempts);
    } else {
      console.error('[PumpPortal] Max reconnection attempts reached');
      this.updateConnectionStatus(false);
    }
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = window.setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
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
    const currentTime = format(new Date(), UTC_DATE_FORMAT);
    usePumpPortalStore.setState({
      currentTime
    });
  }

  public disconnect(): void {
    console.log('[PumpPortal] Disconnecting...');
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

    this.updateConnectionStatus(false);
  }

  public getStatus(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  public sendMessage(message: WebSocketMessage): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.error('[PumpPortal] Cannot send message - WebSocket is not connected');
    }
  }
}

export const wsManager = new WebSocketManager();

// Make wsManager available globally for debugging
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
import { create } from 'zustand';

interface TokenData {
  name: string;
  symbol: string;
  marketCap: number;
  marketCapSol: number;
  liquidityAdded: boolean;
  holders: number;
  volume24h: number;
  address: string;
  price: number;
  imageUrl?: string;
  signature?: string;
  uri?: string;
  initialBuy?: number;
  solAmount?: number;
  vTokensInBondingCurve?: number;
  vSolInBondingCurve?: number;
  bondingCurveKey?: string;
  lastUpdated?: number;  // Timestamp of last update
  priceChange24h?: number; // 24h price change percentage
}

interface PumpPortalState {
  tokens: TokenData[];
  isConnected: boolean;
  connectionError: string | null;
  addToken: (token: TokenData) => void;
  updateToken: (address: string, updates: Partial<TokenData>) => void;
  setConnected: (status: boolean) => void;
  setError: (error: string | null) => void;
}

export const usePumpPortalStore = create<PumpPortalState>((set) => ({
  tokens: [],
  isConnected: false,
  connectionError: null,
  addToken: (token) =>
    set((state) => {
      const now = Date.now();
      const enrichedToken = {
        ...token,
        lastUpdated: now,
        // Add mock price change for UI testing (remove in production)
        priceChange24h: Math.random() * 200 - 100,
      };

      return {
        tokens: [...state.tokens, enrichedToken]
          .sort((a, b) => b.marketCapSol - a.marketCapSol)
          .slice(0, 100), // Keep only top 100 tokens
      };
    }),
  updateToken: (address, updates) =>
    set((state) => ({
      tokens: state.tokens.map((token) =>
        token.address === address ? { ...token, ...updates, lastUpdated: Date.now() } : token
      ),
    })),
  setConnected: (status) => {
    set({ isConnected: status, connectionError: null });
  },
  setError: (error) => {
    set({ connectionError: error });
  }
}));

class PumpPortalWebSocket {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 5000;
  private heartbeatInterval: NodeJS.Timeout | null = null;

  connect() {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      this.ws = new WebSocket('wss://pumpportal.fun/api/data');

      this.ws.onopen = () => {
        usePumpPortalStore.getState().setConnected(true);
        this.reconnectAttempts = 0;
        this.subscribeToEvents();
        this.startHeartbeat();
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          // Handle new token creation
          if (data.txType === 'create') {
            const token: TokenData = {
              name: data.name || 'Unknown',
              symbol: data.symbol || 'UNKNOWN',
              marketCap: data.marketCapSol || 0,
              marketCapSol: data.marketCapSol || 0,
              liquidityAdded: data.pool === "pump",
              holders: 0,
              volume24h: 0,
              address: data.mint,
              price: data.solAmount / data.initialBuy || 0,
              imageUrl: data.uri,
              uri: data.uri,
              signature: data.signature,
              initialBuy: data.initialBuy,
              solAmount: data.solAmount,
              vTokensInBondingCurve: data.vTokensInBondingCurve,
              vSolInBondingCurve: data.vSolInBondingCurve,
              bondingCurveKey: data.bondingCurveKey
            };

            usePumpPortalStore.getState().addToken(token);
          }
        } catch (error) {
          console.error('[PumpPortal WebSocket] Error processing message:', error);
          usePumpPortalStore.getState().setError('Failed to process token data');
        }
      };

      this.ws.onclose = (event) => {
        this.cleanup();
        this.reconnect();
      };

      this.ws.onerror = (error) => {
        console.error('[PumpPortal WebSocket] Connection error:', error);
        usePumpPortalStore.getState().setError('WebSocket connection error');
        this.cleanup();
        this.reconnect();
      };

    } catch (error) {
      console.error('[PumpPortal WebSocket] Failed to establish connection:', error);
      usePumpPortalStore.getState().setError('Failed to establish WebSocket connection');
      this.cleanup();
      this.reconnect();
    }
  }

  private startHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.heartbeatInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: "ping" }));
      }
    }, 30000); // Send heartbeat every 30 seconds
  }

  private subscribeToEvents() {
    if (this.ws?.readyState !== WebSocket.OPEN) {
      return;
    }

    this.ws.send(JSON.stringify({
      method: "subscribeNewToken"
    }));
  }

  private cleanup() {
    usePumpPortalStore.getState().setConnected(false);
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private reconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      usePumpPortalStore.getState().setError('Maximum reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    setTimeout(() => {
      this.connect();
    }, this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1));
  }

  disconnect() {
    if (this.ws) {
      this.cleanup();
      this.ws.close();
      this.ws = null;
    }
  }
}

export const pumpPortalSocket = new PumpPortalWebSocket();
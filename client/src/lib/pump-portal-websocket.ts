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
      console.log('[PumpPortal Store] Adding token:', token);
      return {
        tokens: [...state.tokens, token]
          .sort((a, b) => b.marketCap - a.marketCap)
          .slice(0, 100), // Keep only top 100 tokens
      };
    }),
  updateToken: (address, updates) =>
    set((state) => ({
      tokens: state.tokens.map((token) =>
        token.address === address ? { ...token, ...updates } : token
      ),
    })),
  setConnected: (status) => {
    console.log('[PumpPortal Store] Connection status:', status);
    set({ isConnected: status, connectionError: null });
  },
  setError: (error) => {
    console.log('[PumpPortal Store] Connection error:', error);
    set({ connectionError: error });
  }
}));

class PumpPortalWebSocket {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 5000;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private readonly TOTAL_SUPPLY = 1_000_000_000;

  connect() {
    if (this.ws?.readyState === WebSocket.OPEN) {
      console.log('[PumpPortal WebSocket] Already connected');
      return;
    }

    try {
      console.log('[PumpPortal WebSocket] Attempting to connect...');
      this.ws = new WebSocket('wss://pumpportal.fun/api/data');

      this.ws.onopen = () => {
        console.log('[PumpPortal WebSocket] ✅ Connected successfully');
        usePumpPortalStore.getState().setConnected(true);
        this.reconnectAttempts = 0;

        // Subscribe to token events
        this.subscribeToEvents();
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
              signature: data.signature,
              initialBuy: data.initialBuy,
              solAmount: data.solAmount
            };

            usePumpPortalStore.getState().addToken(token);
          }
        } catch (error) {
          console.error('[PumpPortal WebSocket] Error processing message:', error);
          console.error('[PumpPortal WebSocket] Message data:', event.data);
          usePumpPortalStore.getState().setError('Failed to process token data');
        }
      };

      this.ws.onclose = (event) => {
        console.log('[PumpPortal WebSocket] ⚠️ Connection closed', event.code, event.reason);
        this.cleanup();
        this.reconnect();
      };

      this.ws.onerror = (error) => {
        console.error('[PumpPortal WebSocket] 🚨 Connection error:', error);
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

  private subscribeToEvents() {
    if (this.ws?.readyState !== WebSocket.OPEN) {
      console.error('[PumpPortal WebSocket] Cannot subscribe, connection not open');
      return;
    }

    // Subscribe to new token events
    console.log('[PumpPortal WebSocket] Subscribing to new token events...');
    this.ws.send(JSON.stringify({
      method: "subscribeNewToken"
    }));
  }

  private cleanup() {
    console.log('[PumpPortal WebSocket] Cleaning up connection');
    usePumpPortalStore.getState().setConnected(false);
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private reconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[PumpPortal WebSocket] ❌ Max reconnect attempts reached');
      usePumpPortalStore.getState().setError('Maximum reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    console.log(`[PumpPortal WebSocket] 🔄 Attempting reconnect (#${this.reconnectAttempts})...`);

    setTimeout(() => {
      this.connect();
    }, this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1));
  }

  disconnect() {
    if (this.ws) {
      console.log('[PumpPortal WebSocket] 🔌 Closing connection');
      this.cleanup();
      this.ws.close();
      this.ws = null;
    }
  }
}

export const pumpPortalSocket = new PumpPortalWebSocket();
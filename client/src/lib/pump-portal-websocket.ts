import { create } from 'zustand';

interface TokenData {
  name: string;
  symbol: string;
  marketCap: number;
  liquidityAdded: boolean;
  holders: number;
  volume24h: number;
  address: string;
  price: number;
  imageUrl?: string;
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

        // Add mock data for initial UI testing
        this.addMockData();
      };

      this.ws.onmessage = (event) => {
        try {
          console.log('[PumpPortal WebSocket] Received message:', event.data);
          const data = JSON.parse(event.data);
          
          if (data.event === 'newToken') {
            this.handleNewToken(data.token);
          } else if (data.event === 'tokenTrade') {
            this.handleTokenTrade(data.trade);
          }
        } catch (error) {
          console.error('[PumpPortal WebSocket] ❌ Error processing message:', error);
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

    // Subscribe to all token trades
    console.log('[PumpPortal WebSocket] Subscribing to token trades...');
    this.ws.send(JSON.stringify({
      method: "subscribeTokenTrade",
      keys: [] // Empty array to subscribe to all tokens
    }));
  }

  private handleNewToken(tokenData: any) {
    console.log('[PumpPortal WebSocket] Processing new token:', tokenData);
    const token: TokenData = {
      name: tokenData.name || 'Unknown',
      symbol: tokenData.symbol || 'UNKNOWN',
      marketCap: tokenData.marketCap || 0,
      liquidityAdded: Boolean(tokenData.liquidityAdded),
      holders: parseInt(tokenData.holders) || 0,
      volume24h: parseFloat(tokenData.volume24h) || 0,
      address: tokenData.address,
      price: parseFloat(tokenData.price) || 0,
      imageUrl: tokenData.imageUrl,
    };

    usePumpPortalStore.getState().addToken(token);
  }

  private handleTokenTrade(tradeData: any) {
    console.log('[PumpPortal WebSocket] Processing trade:', tradeData);
    if (tradeData.tokenAddress) {
      usePumpPortalStore.getState().updateToken(tradeData.tokenAddress, {
        price: parseFloat(tradeData.price) || 0,
        volume24h: parseFloat(tradeData.volume24h) || 0,
      });
    }
  }

  private addMockData() {
    console.log('[PumpPortal WebSocket] Adding mock data for testing...');
    const mockTokens = [
      {
        name: "Sample Token 1",
        symbol: "ST1",
        price: 0.00001,
        marketCap: 10000,
        liquidityAdded: true,
        holders: 100,
        volume24h: 5000,
        address: "sample1",
        imageUrl: "https://cryptologos.cc/logos/solana-sol-logo.png"
      },
      {
        name: "Sample Token 2",
        symbol: "ST2",
        price: 0.00002,
        marketCap: 20000,
        liquidityAdded: true,
        holders: 200,
        volume24h: 10000,
        address: "sample2",
        imageUrl: "https://cryptologos.cc/logos/solana-sol-logo.png"
      }
    ];

    mockTokens.forEach(token => {
      console.log('[PumpPortal WebSocket] Adding mock token:', token);
      usePumpPortalStore.getState().addToken(token);
    });
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

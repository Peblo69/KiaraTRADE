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
  imageUrl?: string; // Optional token image URL
}

interface PumpFunState {
  tokens: TokenData[];
  isConnected: boolean;
  connectionError: string | null;
  addToken: (token: TokenData) => void;
  updateToken: (address: string, updates: Partial<TokenData>) => void;
  setConnected: (status: boolean) => void;
  setError: (error: string | null) => void;
}

export const usePumpFunStore = create<PumpFunState>((set) => ({
  tokens: [],
  isConnected: false,
  connectionError: null,
  addToken: (token) =>
    set((state) => {
      console.log('[PumpFun Store] Adding token:', token);
      return {
        tokens: [...state.tokens, token]
          .sort((a, b) => b.marketCap - a.marketCap)
          .slice(0, 100), // Keep only the top 100 tokens by market cap
      };
    }),
  updateToken: (address, updates) =>
    set((state) => ({
      tokens: state.tokens.map((token) =>
        token.address === address ? { ...token, ...updates } : token
      ),
    })),
  setConnected: (status) => {
    console.log('[PumpFun Store] Connection status:', status);
    set({ isConnected: status, connectionError: null });
  },
  setError: (error) => {
    console.log('[PumpFun Store] Connection error:', error);
    set({ connectionError: error });
  }
}));

class PumpFunWebSocket {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 5000; // 5 seconds
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private readonly TOTAL_SUPPLY = 1_000_000_000; // 1 billion tokens

  connect() {
    if (this.ws?.readyState === WebSocket.OPEN) {
      console.log('[PumpFun WebSocket] Already connected');
      return;
    }

    try {
      console.log('[PumpFun WebSocket] Attempting to connect...');
      this.ws = new WebSocket('wss://pump.fun/ws/v1');

      this.ws.onopen = () => {
        console.log('[PumpFun WebSocket] ✅ Connected successfully');
        usePumpFunStore.getState().setConnected(true);
        this.reconnectAttempts = 0;

        // Start heartbeat
        this.startHeartbeat();

        // Add mock data for initial UI testing
        this.addMockData();

        // Subscribe to new token events
        if (this.ws?.readyState === WebSocket.OPEN) {
          console.log('[PumpFun WebSocket] Sending subscription request...');
          const subscriptionMsg = {
            type: "subscribe",
            channel: "tokens",
            data: {
              event: "new_token"
            }
          };
          console.log('[PumpFun WebSocket] Subscription message:', subscriptionMsg);
          this.ws.send(JSON.stringify(subscriptionMsg));
        }
      };

      this.ws.onmessage = (event) => {
        try {
          console.log('[PumpFun WebSocket] Received message:', event.data);
          const data = JSON.parse(event.data);

          if (data.type === 'token' && data.data) {
            console.log('[PumpFun WebSocket] Processing token data:', data.data);
            const tokenData = data.data;
            const price = parseFloat(tokenData.price) || 0;
            const marketCap = price * this.TOTAL_SUPPLY;

            const token = {
              name: tokenData.name || 'Unknown',
              symbol: tokenData.symbol || 'UNKNOWN',
              marketCap,
              liquidityAdded: Boolean(tokenData.liquidityAdded),
              holders: parseInt(tokenData.holders) || 0,
              volume24h: parseFloat(tokenData.volume24h) || 0,
              address: tokenData.address,
              price,
              imageUrl: tokenData.uri || undefined,
            };

            console.log('[PumpFun WebSocket] Adding processed token:', token);
            usePumpFunStore.getState().addToken(token);
          }
        } catch (error) {
          console.error('[PumpFun WebSocket] ❌ Error processing message:', error);
          console.error('[PumpFun WebSocket] Message data:', event.data);
          usePumpFunStore.getState().setError('Failed to process token data');
        }
      };

      this.ws.onclose = (event) => {
        console.log('[PumpFun WebSocket] ⚠️ Connection closed', event.code, event.reason);
        this.cleanup();
        this.reconnect();
      };

      this.ws.onerror = (error) => {
        console.error('[PumpFun WebSocket] 🚨 Connection error:', error);
        usePumpFunStore.getState().setError('WebSocket connection error');
        this.cleanup();
        this.reconnect();
      };

    } catch (error) {
      console.error('[PumpFun WebSocket] Failed to establish connection:', error);
      usePumpFunStore.getState().setError('Failed to establish WebSocket connection');
      this.cleanup();
      this.reconnect();
    }
  }

  private addMockData() {
    console.log('[PumpFun WebSocket] Adding mock data for testing...');
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
      console.log('[PumpFun WebSocket] Adding mock token:', token);
      usePumpFunStore.getState().addToken(token);
    });
  }

  private startHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.heartbeatInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        console.log('[PumpFun WebSocket] Sending heartbeat ping');
        this.ws.send(JSON.stringify({ type: "ping" }));
      }
    }, 30000);
  }

  private cleanup() {
    console.log('[PumpFun WebSocket] Cleaning up connection');
    usePumpFunStore.getState().setConnected(false);
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private reconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[PumpFun WebSocket] ❌ Max reconnect attempts reached');
      usePumpFunStore.getState().setError('Maximum reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    console.log(`[PumpFun WebSocket] 🔄 Attempting reconnect (#${this.reconnectAttempts})...`);

    setTimeout(() => {
      this.connect();
    }, this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1)); // Exponential backoff
  }

  disconnect() {
    if (this.ws) {
      console.log('[PumpFun WebSocket] 🔌 Closing connection');
      this.cleanup();
      this.ws.close();
      this.ws = null;
    }
  }
}

export const pumpFunSocket = new PumpFunWebSocket();
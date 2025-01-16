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
}

interface PumpFunState {
  tokens: TokenData[];
  isConnected: boolean;
  addToken: (token: TokenData) => void;
  updateToken: (address: string, updates: Partial<TokenData>) => void;
  setConnected: (status: boolean) => void;
}

export const usePumpFunStore = create<PumpFunState>((set) => ({
  tokens: [],
  isConnected: false,
  addToken: (token) =>
    set((state) => {
      console.log('Adding token to store:', token);
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
    console.log('Setting connection status:', status);
    set({ isConnected: status });
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
      console.log('WebSocket already connected');
      return;
    }

    try {
      console.log('Attempting to connect to PumpFun WebSocket...');
      this.ws = new WebSocket('wss://pump.fun/ws/v1');

      this.ws.onopen = () => {
        console.log('✅ Connected to PumpFun WebSocket');
        usePumpFunStore.getState().setConnected(true);
        this.reconnectAttempts = 0;

        // Start heartbeat
        this.startHeartbeat();

        // For testing - add some mock data while waiting for real data
        this.addMockData();

        // Subscribe to new token events
        if (this.ws?.readyState === WebSocket.OPEN) {
          console.log('Sending subscription request...');
          const subscriptionMsg = {
            type: "subscribe",
            channel: "tokens",
            data: {
              event: "new_token"
            }
          };
          console.log('Subscription message:', subscriptionMsg);
          this.ws.send(JSON.stringify(subscriptionMsg));
        }
      };

      this.ws.onmessage = (event) => {
        try {
          console.log('Received WebSocket message:', event.data);
          const data = JSON.parse(event.data);

          if (data.type === 'token' && data.data) {
            console.log('Processing new token data:', data.data);
            const tokenData = data.data;
            const price = parseFloat(tokenData.price) || 0;
            const marketCap = price * this.TOTAL_SUPPLY; // Calculate market cap based on 1B supply

            const token = {
              name: tokenData.name || 'Unknown',
              symbol: tokenData.symbol || 'UNKNOWN',
              marketCap,
              liquidityAdded: Boolean(tokenData.liquidityAdded),
              holders: parseInt(tokenData.holders) || 0,
              volume24h: parseFloat(tokenData.volume24h) || 0,
              address: tokenData.address,
              price,
            };

            console.log('Adding processed token:', token);
            usePumpFunStore.getState().addToken(token);
          }
        } catch (error) {
          console.error('❌ Error processing WebSocket message:', error);
          console.error('Message data:', event.data);
        }
      };

      this.ws.onclose = (event) => {
        console.log('⚠️ PumpFun WebSocket disconnected', event.code, event.reason);
        this.cleanup();
        this.reconnect();
      };

      this.ws.onerror = (error) => {
        console.error('🚨 PumpFun WebSocket error:', error);
        this.cleanup();
        this.reconnect();
      };

    } catch (error) {
      console.error('Failed to establish WebSocket connection:', error);
      this.cleanup();
      this.reconnect();
    }
  }

  private addMockData() {
    // Add some mock data for testing
    const mockTokens = [
      {
        name: "Sample Token 1",
        symbol: "ST1",
        price: 0.00001,
        marketCap: 10000,
        liquidityAdded: true,
        holders: 100,
        volume24h: 5000,
        address: "sample1"
      },
      {
        name: "Sample Token 2",
        symbol: "ST2",
        price: 0.00002,
        marketCap: 20000,
        liquidityAdded: true,
        holders: 200,
        volume24h: 10000,
        address: "sample2"
      }
    ];

    mockTokens.forEach(token => {
      usePumpFunStore.getState().addToken(token);
    });
  }

  private startHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.heartbeatInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        console.log('Sending heartbeat');
        this.ws.send(JSON.stringify({ type: "ping" }));
      }
    }, 30000);
  }

  private cleanup() {
    console.log('Cleaning up WebSocket connection');
    usePumpFunStore.getState().setConnected(false);
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private reconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ Max WebSocket reconnect attempts reached');
      return;
    }

    this.reconnectAttempts++;
    console.log(`🔄 Attempting WebSocket reconnect (#${this.reconnectAttempts})...`);

    setTimeout(() => {
      this.connect();
    }, this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1)); // Exponential backoff
  }

  disconnect() {
    if (this.ws) {
      console.log('🔌 Closing WebSocket connection');
      this.cleanup();
      this.ws.close();
      this.ws = null;
    }
  }
}

export const pumpFunSocket = new PumpFunWebSocket();
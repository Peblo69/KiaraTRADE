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
    set((state) => ({
      // Sort tokens by market cap in descending order when adding new token
      tokens: [...state.tokens, token]
        .sort((a, b) => b.marketCap - a.marketCap)
        .slice(0, 100), // Keep only the top 100 tokens
    })),
  updateToken: (address, updates) =>
    set((state) => ({
      tokens: state.tokens.map((token) =>
        token.address === address ? { ...token, ...updates } : token
      ),
    })),
  setConnected: (status) => set({ isConnected: status }),
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
      this.ws = new WebSocket('wss://pumpportal.fun/api/data');

      this.ws.onopen = () => {
        console.log('✅ Connected to PumpFun WebSocket');
        usePumpFunStore.getState().setConnected(true);
        this.reconnectAttempts = 0;

        // Start heartbeat
        this.startHeartbeat();

        // Subscribe to new token events
        if (this.ws?.readyState === WebSocket.OPEN) {
          console.log('Sending subscription request...');
          this.ws.send(JSON.stringify({
            method: "subscribeNewToken",
            params: {
              type: "newTokens"
            }
          }));
        }
      };

      this.ws.onmessage = (event) => {
        try {
          console.log('Received WebSocket message:', event.data);
          const data = JSON.parse(event.data);

          if (data.method === 'subscribeNewToken' && data.params) {
            console.log('Processing new token data:', data.params);
            const price = parseFloat(data.params.price) || 0;
            const marketCap = price * this.TOTAL_SUPPLY; // Calculate market cap based on 1B supply

            usePumpFunStore.getState().addToken({
              name: data.params.name || 'Unknown',
              symbol: data.params.symbol || 'UNKNOWN',
              marketCap, // Store calculated market cap
              liquidityAdded: Boolean(data.params.liquidityAdded),
              holders: parseInt(data.params.holders) || 0,
              volume24h: parseFloat(data.params.volume24h) || 0,
              address: data.params.address,
              price,
            });
          }
        } catch (error) {
          console.error('❌ Error processing WebSocket message:', error);
        }
      };

      this.ws.onclose = () => {
        console.log('⚠️ PumpFun WebSocket disconnected');
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

  private startHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.heartbeatInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ method: "heartbeat" }));
      }
    }, 30000);
  }

  private cleanup() {
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
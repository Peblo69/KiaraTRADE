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
  addToken: (token) => {
    console.log('Adding new token:', token);
    set((state) => ({
      tokens: [token, ...state.tokens].slice(0, 100) // Keep only latest 100 tokens
    }));
  },
  updateToken: (address, updates) =>
    set((state) => ({
      tokens: state.tokens.map(token =>
        token.address === address ? { ...token, ...updates } : token
      )
    })),
  setConnected: (status) => set({ isConnected: status })
}));

class PumpFunWebSocket {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  connect() {
    try {
      if (this.ws?.readyState === WebSocket.OPEN) {
        console.log('WebSocket already connected');
        return;
      }

      console.log('Attempting to connect to PumpFun WebSocket...');
      this.ws = new WebSocket('wss://pumpportal.fun/api/data');

      this.ws.onopen = () => {
        console.log('Connected to PumpFun WebSocket');
        this.reconnectAttempts = 0;
        usePumpFunStore.getState().setConnected(true);

        // Subscribe to new token events
        if (this.ws?.readyState === WebSocket.OPEN) {
          console.log('Subscribing to new token events...');
          const payload = {
            method: "subscribeNewToken"
          };
          this.ws.send(JSON.stringify(payload));
        }
      };

      this.ws.onmessage = (event) => {
        console.log('Received WebSocket message:', event.data);
        try {
          const data = JSON.parse(event.data);
          console.log('Parsed WebSocket data:', data);

          // Process incoming token data
          if (data.type === 'newToken') {
            console.log('Processing new token:', data);
            usePumpFunStore.getState().addToken({
              name: data.name || 'Unknown',
              symbol: data.symbol || 'UNKNOWN',
              marketCap: data.marketCap || 0,
              liquidityAdded: data.liquidityAdded || false,
              holders: data.holders || 0,
              volume24h: data.volume24h || 0,
              address: data.address,
              price: data.price || 0
            });
          }
        } catch (error) {
          console.error('Error processing WebSocket message:', error);
        }
      };

      this.ws.onclose = () => {
        console.log('PumpFun WebSocket disconnected');
        usePumpFunStore.getState().setConnected(false);
        this.attemptReconnect();
      };

      this.ws.onerror = (error) => {
        console.error('PumpFun WebSocket error:', error);
        usePumpFunStore.getState().setConnected(false);
      };

    } catch (error) {
      console.error('Failed to connect to PumpFun WebSocket:', error);
      usePumpFunStore.getState().setConnected(false);
      this.attemptReconnect();
    }
  }

  private attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      setTimeout(() => this.connect(), this.reconnectDelay * this.reconnectAttempts);
    }
  }

  disconnect() {
    if (this.ws) {
      console.log('Disconnecting from PumpFun WebSocket');
      this.ws.close();
      this.ws = null;
      usePumpFunStore.getState().setConnected(false);
    }
  }
}

export const pumpFunSocket = new PumpFunWebSocket();
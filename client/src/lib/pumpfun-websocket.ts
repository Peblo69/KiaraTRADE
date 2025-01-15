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

// Create store with initial state and actions
export const usePumpFunStore = create<PumpFunState>()((set) => ({
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
  private isConnecting = false;

  connect() {
    if (this.isConnecting) {
      console.log('Already attempting to connect');
      return;
    }

    if (this.ws?.readyState === WebSocket.OPEN) {
      console.log('WebSocket already connected');
      return;
    }

    try {
      this.isConnecting = true;
      console.log('Attempting to connect to PumpFun WebSocket...');

      this.ws = new WebSocket('wss://pumpportal.fun/api/data');

      this.ws.onopen = () => {
        console.log('Connected to PumpFun WebSocket');
        this.reconnectAttempts = 0;
        this.isConnecting = false;
        usePumpFunStore.getState().setConnected(true);

        if (this.ws?.readyState === WebSocket.OPEN) {
          console.log('Subscribing to new token events...');
          const payload = {
            method: "subscribeNewToken"
          };
          this.ws.send(JSON.stringify(payload));
        }
      };

      this.ws.onmessage = (event) => {
        try {
          console.log('Received WebSocket message:', event.data);
          const data = JSON.parse(event.data);
          console.log('Parsed WebSocket data:', data);

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
        this.isConnecting = false;
        usePumpFunStore.getState().setConnected(false);
        this.attemptReconnect();
      };

      this.ws.onerror = (error) => {
        console.error('PumpFun WebSocket error:', error);
        this.isConnecting = false;
        usePumpFunStore.getState().setConnected(false);
      };

    } catch (error) {
      console.error('Failed to connect to PumpFun WebSocket:', error);
      this.isConnecting = false;
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
      this.isConnecting = false;
      usePumpFunStore.getState().setConnected(false);
    }
  }
}

// Create a single instance to be used across the application
export const pumpFunSocket = new PumpFunWebSocket();
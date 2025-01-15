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
  addToken: (token: TokenData) => void;
  updateToken: (address: string, updates: Partial<TokenData>) => void;
}

export const usePumpFunStore = create<PumpFunState>((set) => ({
  tokens: [],
  addToken: (token) => 
    set((state) => ({
      tokens: [token, ...state.tokens].slice(0, 100) // Keep only latest 100 tokens
    })),
  updateToken: (address, updates) =>
    set((state) => ({
      tokens: state.tokens.map(token =>
        token.address === address ? { ...token, ...updates } : token
      )
    }))
}));

class PumpFunWebSocket {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  connect() {
    try {
      this.ws = new WebSocket('wss://pumpportal.fun/api/data');

      this.ws.onopen = () => {
        console.log('Connected to PumpFun WebSocket');
        this.reconnectAttempts = 0;
        
        // Subscribe to new token events
        const payload = {
          method: "subscribeNewToken"
        };
        this.ws?.send(JSON.stringify(payload));
      };

      this.ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        // Process incoming token data
        if (data.type === 'newToken') {
          usePumpFunStore.getState().addToken({
            name: data.name,
            symbol: data.symbol,
            marketCap: data.marketCap || 0,
            liquidityAdded: data.liquidityAdded || false,
            holders: data.holders || 0,
            volume24h: data.volume24h || 0,
            address: data.address,
            price: data.price || 0
          });
        }
      };

      this.ws.onclose = () => {
        console.log('PumpFun WebSocket disconnected');
        this.attemptReconnect();
      };

      this.ws.onerror = (error) => {
        console.error('PumpFun WebSocket error:', error);
      };

    } catch (error) {
      console.error('Failed to connect to PumpFun WebSocket:', error);
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
      this.ws.close();
      this.ws = null;
    }
  }
}

export const pumpFunSocket = new PumpFunWebSocket();

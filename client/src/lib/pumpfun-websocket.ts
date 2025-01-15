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
      tokens: [token, ...state.tokens].slice(0, 100), // Keep only the latest 100 tokens
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

  connect() {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return; // Avoid multiple connections
    }

    this.ws = new WebSocket('wss://pumpportal.fun/api/data');

    this.ws.onopen = () => {
      console.log('✅ Connected to PumpFun WebSocket');
      usePumpFunStore.getState().setConnected(true);
      this.reconnectAttempts = 0; // Reset reconnect attempts

      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ method: "subscribeNewToken" }));
      }
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.method === 'subscribeNewToken') {
          usePumpFunStore.getState().addToken({
            name: data.params.name || 'Unknown',
            symbol: data.params.symbol || 'UNKNOWN',
            marketCap: data.params.marketCap || 0,
            liquidityAdded: data.params.liquidityAdded || false,
            holders: data.params.holders || 0,
            volume24h: data.params.volume24h || 0,
            address: data.params.address,
            price: data.params.price || 0,
          });
        }
      } catch (error) {
        console.error('❌ Error processing WebSocket message:', error);
      }
    };

    this.ws.onclose = () => {
      console.log('⚠️ PumpFun WebSocket disconnected');
      usePumpFunStore.getState().setConnected(false);
      this.reconnect();
    };

    this.ws.onerror = (error) => {
      console.error('🚨 PumpFun WebSocket error:', error);
      usePumpFunStore.getState().setConnected(false);
      this.reconnect();
    };
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
    }, this.reconnectDelay);
  }

  disconnect() {
    if (this.ws) {
      console.log('🔌 Closing WebSocket connection');
      this.ws.close();
      this.ws = null;
      usePumpFunStore.getState().setConnected(false);
    }
  }
}

export const pumpFunSocket = new PumpFunWebSocket();

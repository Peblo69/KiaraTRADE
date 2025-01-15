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
  addToken: (token) => set((state) => ({
    tokens: [token, ...state.tokens].slice(0, 100) // Keep only latest 100 tokens
  })),
  updateToken: (address, updates) => set((state) => ({
    tokens: state.tokens.map(token =>
      token.address === address ? { ...token, ...updates } : token
    )
  })),
  setConnected: (status) => set({ isConnected: status })
}));

class PumpFunWebSocket {
  private ws: WebSocket | null = null;

  connect() {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    this.ws = new WebSocket('wss://pumpportal.fun/api/data');

    this.ws.onopen = () => {
      console.log('Connected to PumpFun WebSocket');
      usePumpFunStore.getState().setConnected(true);

      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ method: "subscribeNewToken" }));
      }
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'newToken') {
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
    };

    this.ws.onerror = (error) => {
      console.error('PumpFun WebSocket error:', error);
      usePumpFunStore.getState().setConnected(false);
    };
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
      usePumpFunStore.getState().setConnected(false);
    }
  }
}

export const pumpFunSocket = new PumpFunWebSocket();
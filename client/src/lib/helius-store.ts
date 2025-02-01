
import { create } from 'zustand';

interface Trade {
  signature: string;
  timestamp: number;
  tokenAmount: number;
  solAmount: number;
  txType: 'buy' | 'sell'; 
  priceInUsd?: number;
  traderPublicKey: string;
}

interface HeliusState {
  isConnected: boolean;
  trades: { [key: string]: Trade[] };
  subscribeToToken: (mint: string) => void;
}

export const useHeliusStore = create<HeliusState>((set, get) => ({
  isConnected: false,
  trades: {},
  subscribeToToken: (mint: string) => {
    if (!mint) return;
    
    // Initialize trades array for this token if it doesn't exist
    if (!get().trades[mint]) {
      set(state => ({
        trades: {
          ...state.trades,
          [mint]: []
        }
      }));
    }

    // Send subscription message to WebSocket
    try {
      const ws = new WebSocket('wss://helius-rpc.com/v0/ws');
      
      ws.onopen = () => {
        set({ isConnected: true });
        ws.send(JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'accountSubscribe',
          params: [mint]
        }));
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log('🔵 Helius WS Message:', data);
      };

      ws.onclose = () => {
        set({ isConnected: false });
      };

    } catch (error) {
      console.error('Helius WS Error:', error);
    }
  }
}));

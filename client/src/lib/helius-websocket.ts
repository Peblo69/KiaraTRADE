import { create } from 'zustand';
import { usePumpPortalStore } from './pump-portal-websocket';

interface HeliusTokenData {
  mint: string;
  name: string;
  symbol: string;
  uri?: string;
  signature?: string;
}

interface HeliusState {
  isConnected: boolean;
  connectionError: string | null;
  setConnected: (status: boolean) => void;
  setError: (error: string | null) => void;
}

export const useHeliusStore = create<HeliusState>((set) => ({
  isConnected: false,
  connectionError: null,
  setConnected: (status) => set({ isConnected: status, connectionError: null }),
  setError: (error) => set({ connectionError: error })
}));

class HeliusWebSocket {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 5000;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private readonly API_KEY = '004f9b13-f526-4952-9998-52f5c7bec6ee';

  connect() {
    if (this.ws?.readyState === WebSocket.OPEN) {
      console.log('[Helius WebSocket] Already connected');
      return;
    }

    try {
      console.log('[Helius WebSocket] Attempting to connect...');
      this.ws = new WebSocket(`wss://mainnet.helius-rpc.com/?api-key=${this.API_KEY}`);

      this.ws.onopen = () => {
        console.log('[Helius WebSocket] Connected successfully');
        useHeliusStore.getState().setConnected(true);
        this.reconnectAttempts = 0;
        this.startHeartbeat();
        this.subscribeToTokenEvents();
      };

      this.ws.onmessage = async (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'create') {
            const tokenData: HeliusTokenData = {
              mint: data.mint,
              name: data.name || 'Unknown',
              symbol: data.symbol || 'UNKNOWN',
              uri: data.uri,
              signature: data.signature,
            };

            // Enrich token data in PumpPortal store
            const existingToken = usePumpPortalStore.getState().tokens.find(
              t => t.address === tokenData.mint
            );

            if (existingToken) {
              usePumpPortalStore.getState().updateToken(tokenData.mint, {
                name: tokenData.name,
                symbol: tokenData.symbol,
                uri: tokenData.uri,
                signature: tokenData.signature,
              });
            }
          }
        } catch (error) {
          console.error('[Helius WebSocket] Error processing message:', error);
          useHeliusStore.getState().setError('Failed to process token data');
        }
      };

      this.ws.onclose = () => {
        console.log('[Helius WebSocket] Connection closed');
        this.cleanup();
        this.reconnect();
      };

      this.ws.onerror = (error) => {
        console.error('[Helius WebSocket] Connection error:', error);
        useHeliusStore.getState().setError('WebSocket connection error');
        this.cleanup();
        this.reconnect();
      };

    } catch (error) {
      console.error('[Helius WebSocket] Failed to establish connection:', error);
      useHeliusStore.getState().setError('Failed to establish WebSocket connection');
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
        this.ws.send(JSON.stringify({ type: "ping" }));
      }
    }, 30000);
  }

  private subscribeToTokenEvents() {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "subscribeTokenEvents",
        params: {}
      }));
    }
  }

  private cleanup() {
    useHeliusStore.getState().setConnected(false);
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private reconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      useHeliusStore.getState().setError('Maximum reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    setTimeout(() => {
      this.connect();
    }, this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1));
  }

  disconnect() {
    if (this.ws) {
      this.cleanup();
      this.ws.close();
      this.ws = null;
    }
  }
}

export const heliusSocket = new HeliusWebSocket();

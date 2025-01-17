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
  imageUrl?: string;
  signature?: string;
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
          .slice(0, 100), // Keep only top 100 tokens
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
  private reconnectDelay = 5000;
  private heartbeatInterval: NodeJS.Timeout | null = null;

  connect() {
    if (this.ws?.readyState === WebSocket.OPEN) {
      console.log('[PumpFun WebSocket] Already connected');
      return;
    }

    try {
      console.log('[PumpFun WebSocket] Attempting to connect...');
      this.ws = new WebSocket('wss://pump.fun/ws/v1');

      this.ws.onopen = () => {
        console.log('[PumpFun WebSocket] Connected successfully');
        usePumpFunStore.getState().setConnected(true);
        this.reconnectAttempts = 0;
        this.startHeartbeat();
        this.subscribeToNewTokens();
        this.requestInitialTokens();
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('[PumpFun WebSocket] Received message:', {
            type: data.type,
            data: data.data ? {
              ...data.data,
              // Log everything except sensitive data
              signature: data.data.signature ? '[REDACTED]' : undefined
            } : null,
            timestamp: new Date().toISOString()
          });

          if (data.type === 'token') {
            const tokenData = data.data;
            if (!tokenData) return;

            const token: TokenData = {
              name: tokenData.name || 'Unknown',
              symbol: tokenData.symbol || 'UNKNOWN',
              marketCap: parseFloat(tokenData.marketCap) || 0,
              liquidityAdded: Boolean(tokenData.liquidityAdded),
              holders: parseInt(tokenData.holders) || 0,
              volume24h: parseFloat(tokenData.volume24h) || 0,
              address: tokenData.address,
              price: parseFloat(tokenData.price) || 0,
              imageUrl: tokenData.uri || `https://pump.fun/token/${tokenData.address}/image`,
              signature: tokenData.signature,
            };

            console.log('[PumpFun WebSocket] Processing token:', {
              ...token,
              signature: token.signature ? '[REDACTED]' : undefined
            });
            usePumpFunStore.getState().addToken(token);
          }
        } catch (error) {
          console.error('[PumpFun WebSocket] Error processing message:', error);
          usePumpFunStore.getState().setError('Failed to process token data');
        }
      };

      this.ws.onclose = () => {
        console.log('[PumpFun WebSocket] Connection closed');
        this.cleanup();
        this.reconnect();
      };

      this.ws.onerror = (error) => {
        console.error('[PumpFun WebSocket] Connection error:', error);
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

  private startHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.heartbeatInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        console.log('[PumpFun WebSocket] Sending heartbeat');
        this.ws.send(JSON.stringify({ type: "ping" }));
      }
    }, 30000);
  }

  private subscribeToNewTokens() {
    if (this.ws?.readyState !== WebSocket.OPEN) {
      console.log('[PumpFun WebSocket] Cannot subscribe, connection not open');
      return;
    }

    console.log('[PumpFun WebSocket] Subscribing to new tokens');
    this.ws.send(JSON.stringify({
      type: "subscribe",
      channel: "tokens",
      event: "new"
    }));
  }

  private requestInitialTokens() {
    if (this.ws?.readyState !== WebSocket.OPEN) {
      console.log('[PumpFun WebSocket] Cannot request initial tokens, connection not open');
      return;
    }

    console.log('[PumpFun WebSocket] Requesting initial token list');
    this.ws.send(JSON.stringify({
      type: "get_tokens",
      limit: 100,
      sort: "market_cap",
      order: "desc"
    }));
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
      console.error('[PumpFun WebSocket] Max reconnection attempts reached');
      usePumpFunStore.getState().setError('Maximum reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    console.log(`[PumpFun WebSocket] Attempting reconnect (#${this.reconnectAttempts})`);

    setTimeout(() => {
      this.connect();
    }, this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1));
  }

  disconnect() {
    if (this.ws) {
      console.log('[PumpFun WebSocket] Disconnecting');
      this.cleanup();
      this.ws.close();
      this.ws = null;
    }
  }
}

export const pumpFunSocket = new PumpFunWebSocket();
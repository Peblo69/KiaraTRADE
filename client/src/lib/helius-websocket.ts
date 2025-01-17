import { create } from 'zustand';
import { usePumpPortalStore } from './pump-portal-websocket';
import { useTokenPriceStore } from './price-history';

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
  private messageHandlers: ((data: any) => void)[] = [];

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
          console.log('[Helius WebSocket] Received message:', data);

          // Notify all message handlers
          this.messageHandlers.forEach(handler => handler(data));

          if (data.type === 'transaction') {
            // Extract transaction details
            const { description, type, tokenTransfers, nativeTransfers, accountData } = data;
            console.log('[Helius WebSocket] Processing transaction:', { description, type });

            // Process token transfers
            if (tokenTransfers?.length > 0) {
              tokenTransfers.forEach((transfer: any) => {
                if (!transfer.mint) return;

                const existingToken = usePumpPortalStore.getState().tokens.find(
                  t => t.address === transfer.mint
                );

                if (existingToken) {
                  // Calculate new values
                  const volume24h = (existingToken.volume24h || 0) + (parseFloat(transfer.amount) || 0);
                  const price = transfer.amount && transfer.tokenAmount 
                    ? parseFloat(transfer.amount) / parseFloat(transfer.tokenAmount)
                    : existingToken.price;

                  // Update price history
                  if (price && !isNaN(price)) {
                    useTokenPriceStore.getState().addPricePoint(transfer.mint, price);
                  }

                  // Update token data
                  console.log('[Helius WebSocket] Updating token data:', {
                    mint: transfer.mint,
                    volume24h,
                    price
                  });

                  usePumpPortalStore.getState().updateToken(transfer.mint, {
                    volume24h,
                    price,
                    lastUpdated: Date.now()
                  });
                }
              });
            }

            // Process native transfers for market cap updates
            if (nativeTransfers?.length > 0) {
              const totalTransfer = nativeTransfers.reduce(
                (sum: number, transfer: any) => sum + (parseFloat(transfer.amount) || 0),
                0
              );

              if (totalTransfer > 0 && data.mint) {
                const existingToken = usePumpPortalStore.getState().tokens.find(
                  t => t.address === data.mint
                );

                if (existingToken) {
                  // Update market cap based on total transfer
                  const marketCapSol = totalTransfer * (existingToken.price || 0);
                  usePumpPortalStore.getState().updateToken(data.mint, {
                    marketCapSol,
                    lastUpdated: Date.now()
                  });
                }
              }
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

  onMessage(handler: (data: any) => void) {
    this.messageHandlers.push(handler);
  }

  private startHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.heartbeatInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        console.log('[Helius WebSocket] Sending heartbeat');
        this.ws.send(JSON.stringify({ type: "ping" }));
      }
    }, 30000);
  }

  private subscribeToTokenEvents() {
    if (this.ws?.readyState === WebSocket.OPEN) {
      console.log('[Helius WebSocket] Subscribing to token events');
      this.ws.send(JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "subscribeTransactions",
        params: {
          accountIds: [], // Subscribe to all transactions
          filter: {
            filters: [
              { value: "SWAP", field: "type" },
              { value: "TRANSFER", field: "type" },
              { value: "NFT_SALE", field: "type" },
              { value: "TOKEN_CREATE", field: "type" }
            ]
          }
        }
      }));
    }
  }

  private cleanup() {
    useHeliusStore.getState().setConnected(false);
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    this.messageHandlers = [];
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
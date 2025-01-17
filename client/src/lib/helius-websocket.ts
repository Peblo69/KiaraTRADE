import { create } from 'zustand';
import { usePumpPortalStore } from './pump-portal-websocket';
import { useTokenPriceStore } from './price-history';
import { useTokenVolumeStore } from './token-volume';

interface HeliusTokenData {
  mint: string;
  name: string;
  symbol: string;
  uri?: string;
  signature?: string;
  price?: number;
  volume24h?: number;
  marketCap?: number;
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
            const { accountData, type: txType, tokenTransfers, nativeTransfers } = data;

            if (txType === 'SWAP' || txType === 'TRANSFER' || txType === 'TOKEN_CREATE') {
              const transfers = tokenTransfers || [];
              transfers.forEach(async (transfer: any) => {
                if (!transfer.mint) return;

                try {
                  // Fetch token metadata
                  const metadata = await this.fetchTokenMetadata(transfer.mint);
                  if (!metadata) return;

                  const volume = parseFloat(transfer.amount) || 0;
                  const price = transfer.tokenAmount ? volume / parseFloat(transfer.tokenAmount) : 0;

                  // Update token data in store
                  const tokenData = {
                    name: metadata.name || 'Unknown',
                    symbol: metadata.symbol || 'UNKNOWN',
                    address: transfer.mint,
                    price,
                    volume24h: volume,
                    marketCap: price * (metadata.supply || 0),
                    imageUrl: metadata.image || undefined,
                    uri: metadata.uri,
                    holders: metadata.holders || 0,
                    liquidityAdded: true // Set based on actual pool data
                  };

                  console.log('[Helius WebSocket] Processing token:', tokenData);

                  // Update stores
                  if (price && !isNaN(price)) {
                    useTokenPriceStore.getState().addPricePoint(transfer.mint, price);
                  }

                  if (volume && !isNaN(volume)) {
                    useTokenVolumeStore.getState().addVolumeData(transfer.mint, volume);
                  }

                  const existingToken = usePumpPortalStore.getState().tokens.find(
                    t => t.address === transfer.mint
                  );

                  if (existingToken) {
                    usePumpPortalStore.getState().updateToken(transfer.mint, tokenData);
                  } else {
                    usePumpPortalStore.getState().addToken(tokenData);
                  }

                } catch (error) {
                  console.error('[Helius WebSocket] Error processing transfer:', error);
                }
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

  private async fetchTokenMetadata(mint: string) {
    try {
      const response = await fetch('https://mainnet.helius-rpc.com/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 'my-id',
          method: 'getAsset',
          params: {
            id: mint,
          },
        }),
      });

      const data = await response.json();
      if (data.result) {
        return {
          name: data.result.content?.metadata?.name,
          symbol: data.result.content?.metadata?.symbol,
          uri: data.result.content?.json_uri,
          image: data.result.content?.links?.image,
          supply: data.result.token_info?.supply,
          holders: data.result.token_info?.holder_count,
        };
      }
    } catch (error) {
      console.error('[Helius WebSocket] Error fetching token metadata:', error);
    }
    return null;
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
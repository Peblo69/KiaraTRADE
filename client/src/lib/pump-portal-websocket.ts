import { create } from 'zustand';
import { useTokenVolumeStore } from './token-volume';
import { useTokenPriceStore } from './price-history';
import { useTokenSocialMetricsStore } from './social-metrics';

interface TokenMetadata {
  name: string;
  symbol: string;
  description?: string;
  image: string;
  showName?: boolean;
  createdOn?: string;
  twitter?: string;
  website?: string;
}

interface TokenMetrics {
  twitterFollowers?: number;
  twitterMentions24h?: number;
  telegramMembers?: number;
  discordMembers?: number;
  sentiment?: number;
}

interface TokenData {
  name: string;
  symbol: string;
  marketCap: number;
  marketCapSol: number;
  liquidityAdded: boolean;
  holders: number;
  volume24h: number;
  address: string;
  price: number;
  imageUrl?: string;
  signature?: string;
  uri?: string;
  initialBuy?: number;
  solAmount?: number;
  vTokensInBondingCurve?: number;
  vSolInBondingCurve?: number;
  bondingCurveKey?: string;
  lastUpdated?: number;
  priceChange24h?: number;
  metadata?: TokenMetadata;
  metrics?: TokenMetrics;
}

interface PumpPortalState {
  tokens: TokenData[];
  isConnected: boolean;
  connectionError: string | null;
  addToken: (token: TokenData) => void;
  updateToken: (address: string, updates: Partial<TokenData>) => void;
  setConnected: (status: boolean) => void;
  setError: (error: string | null) => void;
}

const parseTokenMetadata = async (uri: string): Promise<TokenMetadata | null> => {
  try {
    if (!uri) return null;
    const response = await fetch(uri);
    if (!response.ok) throw new Error('Failed to fetch metadata');
    const metadata = await response.json();
    return metadata;
  } catch (error) {
    console.error('[PumpPortal Store] Error fetching token metadata:', error);
    return null;
  }
};

const processSocialMetrics = async (token: TokenData) => {
  if (!token.address) return;

  try {
    if (token.metadata?.twitter) {
      const metrics: TokenMetrics = {
        twitterFollowers: 0, 
        twitterMentions24h: 0, 
        telegramMembers: 0,
        discordMembers: 0,
        sentiment: 0,
        lastUpdated: Date.now()
      };

      useTokenSocialMetricsStore.getState().setMetrics(token.address, metrics);
    }
  } catch (error) {
    console.error('[PumpPortal Store] Error processing social metrics:', error);
  }
};

export const usePumpPortalStore = create<PumpPortalState>((set) => ({
  tokens: [],
  isConnected: false,
  connectionError: null,
  addToken: async (token) => {
    set((state) => {
      const now = Date.now();
      const enrichedToken = {
        ...token,
        lastUpdated: now,
      };

      if (token.address) {
        try {
          useTokenVolumeStore.getState().addVolumeData(token.address, token.volume24h || 0);
          useTokenPriceStore.getState().initializePriceHistory(token.address, token.price);

          processSocialMetrics(enrichedToken);

          if (token.uri) {
            parseTokenMetadata(token.uri).then(metadata => {
              if (metadata) {
                set(state => ({
                  tokens: state.tokens.map(t => 
                    t.address === token.address 
                      ? { ...t, metadata }
                      : t
                  )
                }));

                if (metadata.twitter) {
                  processSocialMetrics({
                    ...enrichedToken,
                    metadata
                  });
                }
              }
            });
          }
        } catch (error) {
          console.error('[PumpPortal Store] Error initializing token data:', error);
        }
      }

      return {
        tokens: [...state.tokens, enrichedToken]
          .sort((a, b) => b.marketCapSol - a.marketCapSol)
          .slice(0, 100), 
      };
    });
  },
  updateToken: (address, updates) =>
    set((state) => {
      const currentToken = state.tokens.find(token => token.address === address);
      if (!currentToken) return state;

      const priceChange24h = updates.price !== undefined && currentToken.price !== undefined
        ? ((updates.price - currentToken.price) / currentToken.price) * 100
        : currentToken.priceChange24h;

      return {
        tokens: state.tokens.map((token) =>
          token.address === address 
            ? { 
                ...token, 
                ...updates, 
                priceChange24h,
                lastUpdated: Date.now() 
              } 
            : token
        ),
      };
    }),
  setConnected: (status) => {
    console.log('[PumpPortal Store] Connection status:', status);
    set({ isConnected: status, connectionError: null });
  },
  setError: (error) => {
    console.log('[PumpPortal Store] Connection error:', error);
    set({ connectionError: error });
  }
}));

class PumpPortalWebSocket {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 5000;
  private heartbeatInterval: NodeJS.Timeout | null = null;

  connect() {
    if (this.ws?.readyState === WebSocket.OPEN) {
      console.log('[PumpPortal WebSocket] Already connected');
      return;
    }

    try {
      console.log('[PumpPortal WebSocket] Attempting to connect...');
      this.ws = new WebSocket('wss://pumpportal.fun/api/data');

      this.ws.onopen = () => {
        console.log('[PumpPortal WebSocket] Connected successfully');
        usePumpPortalStore.getState().setConnected(true);
        this.reconnectAttempts = 0;
        this.subscribeToEvents();
        this.startHeartbeat();
      };

      this.ws.onmessage = async (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('[PumpPortal WebSocket] Received message:', data);

          if (data.txType === 'create') {
            const token: TokenData = {
              name: data.name || 'Unknown',
              symbol: data.symbol || 'UNKNOWN',
              marketCap: data.marketCapSol || 0,
              marketCapSol: data.marketCapSol || 0,
              liquidityAdded: data.pool === "pump",
              holders: data.holders || 0,
              volume24h: data.volume24h || 0,
              address: data.mint,
              price: data.solAmount / (data.initialBuy || 1),
              imageUrl: data.uri,
              uri: data.uri,
              signature: data.signature,
              initialBuy: data.initialBuy,
              solAmount: data.solAmount,
              vTokensInBondingCurve: data.vTokensInBondingCurve,
              vSolInBondingCurve: data.vSolInBondingCurve,
              bondingCurveKey: data.bondingCurveKey
            };

            console.log('[PumpPortal WebSocket] Adding new token:', token);
            await usePumpPortalStore.getState().addToken(token);
          }
        } catch (error) {
          console.error('[PumpPortal WebSocket] Error processing message:', error);
          usePumpPortalStore.getState().setError('Failed to process token data');
        }
      };

      this.ws.onclose = (event) => {
        console.log('[PumpPortal WebSocket] Connection closed:', event);
        this.cleanup();
        this.reconnect();
      };

      this.ws.onerror = (error) => {
        console.error('[PumpPortal WebSocket] Connection error:', error);
        usePumpPortalStore.getState().setError('WebSocket connection error');
        this.cleanup();
        this.reconnect();
      };

    } catch (error) {
      console.error('[PumpPortal WebSocket] Failed to establish connection:', error);
      usePumpPortalStore.getState().setError('Failed to establish WebSocket connection');
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
        console.log('[PumpPortal WebSocket] Sending heartbeat');
        this.ws.send(JSON.stringify({ type: "ping" }));
      }
    }, 30000);
  }

  private subscribeToEvents() {
    if (this.ws?.readyState !== WebSocket.OPEN) {
      console.log('[PumpPortal WebSocket] Cannot subscribe, connection not open');
      return;
    }

    console.log('[PumpPortal WebSocket] Subscribing to events');
    this.ws.send(JSON.stringify({
      method: "subscribeNewToken"
    }));
  }

  private cleanup() {
    console.log('[PumpPortal WebSocket] Cleaning up connection');
    usePumpPortalStore.getState().setConnected(false);
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private reconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[PumpPortal WebSocket] Max reconnection attempts reached');
      usePumpPortalStore.getState().setError('Maximum reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    console.log(`[PumpPortal WebSocket] Attempting reconnect (#${this.reconnectAttempts})`);

    setTimeout(() => {
      this.connect();
    }, this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1));
  }

  disconnect() {
    if (this.ws) {
      console.log('[PumpPortal WebSocket] Disconnecting');
      this.cleanup();
      this.ws.close();
      this.ws = null;
    }
  }
}

export const pumpPortalSocket = new PumpPortalWebSocket();
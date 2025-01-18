import { create } from 'zustand';
import { queryClient } from './queryClient';

export interface Token {
  name: string;
  symbol: string;
  price: number;
  marketCap: number;
  volume24h: number;
  holders: number;
  createdAt: Date;
  address: string;
  imageUrl?: string;
}

interface TokenStore {
  tokens: Token[];
  isConnected: boolean;
  addToken: (token: Token) => void;
  updateToken: (address: string, updates: Partial<Token>) => void;
  setConnected: (connected: boolean) => void;
}

export const useTokenStore = create<TokenStore>((set) => ({
  tokens: [],
  isConnected: false,
  addToken: (token) =>
    set((state) => ({
      tokens: [token, ...state.tokens].slice(0, 8), // Keep only latest 8 tokens
    })),
  updateToken: (address, updates) =>
    set((state) => ({
      tokens: state.tokens.map((token) =>
        token.address === address ? { ...token, ...updates } : token
      ),
    })),
  setConnected: (connected) => set({ isConnected: connected }),
}));

let ws: WebSocket | null = null;
let reconnectTimeout: NodeJS.Timeout | null = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_INTERVAL = 5000;

// BitQuery WebSocket configuration
const BITQUERY_WSS_URL = 'wss://streaming.bitquery.io/graphql';
const BITQUERY_API_KEY = import.meta.env.VITE_BITQUERY_API_KEY;

function initializeWebSocket() {
  if (typeof window === 'undefined') return;

  const store = useTokenStore.getState();

  // Clear any existing reconnect timeout
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
    reconnectTimeout = null;
  }

  // Close existing connection if any
  if (ws) {
    try {
      ws.close();
    } catch (e) {
      console.error('[BitQuery] Error closing WebSocket:', e);
    }
    ws = null;
  }

  try {
    console.log('[BitQuery] Initializing WebSocket connection...');

    // Create WebSocket with authorization header
    ws = new WebSocket(BITQUERY_WSS_URL, 'graphql-ws');

    ws.onopen = () => {
      if (!ws) return;

      console.log('[BitQuery] Connected to WebSocket');

      // Send connection init message with API key
      ws.send(JSON.stringify({
        type: 'connection_init',
        payload: {
          headers: {
            'X-API-KEY': BITQUERY_API_KEY,
          },
        },
      }));

      // Wait for connection acknowledgment
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);

        if (data.type === 'connection_ack') {
          console.log('[BitQuery] Connection acknowledged');
          store.setConnected(true);
          reconnectAttempts = 0;

          // Subscribe to PumpFun token creation events
          const subscriptionId = '1';
          ws?.send(JSON.stringify({
            id: subscriptionId,
            type: 'subscribe',
            payload: {
              query: `
                subscription {
                  Solana {
                    Instructions(
                      where: {
                        Instruction: {
                          Program: { Method: { is: "create" }, Name: { is: "pump" } }
                        }
                      }
                    ) {
                      Instruction {
                        Accounts {
                          Address
                          Token {
                            Mint
                            Owner
                            ProgramId
                          }
                        }
                        Program {
                          Method
                          Name
                        }
                      }
                      Transaction {
                        Signature
                      }
                    }
                  }
                }
              `
            }
          }));

          console.log('[BitQuery] Subscription sent');

          // Update onmessage handler for subscription data
          ws.onmessage = (event) => {
            try {
              const data = JSON.parse(event.data);
              console.log('[BitQuery] Received message:', data);

              if (data.type === 'data' && data.payload?.data?.Solana?.Instructions) {
                const instruction = data.payload.data.Solana.Instructions[0];
                if (instruction?.Instruction?.Program?.Method === 'create') {
                  const token: Token = {
                    name: `Token ${instruction.Instruction.Accounts[0].Token.Mint.slice(0, 8)}`,
                    symbol: `PUMP${instruction.Instruction.Accounts[0].Token.Mint.slice(0, 4)}`,
                    price: 0,
                    marketCap: 0,
                    volume24h: 0,
                    holders: 0,
                    createdAt: new Date(),
                    address: instruction.Instruction.Accounts[0].Token.Mint,
                    imageUrl: undefined,
                  };
                  store.addToken(token);
                  console.log('[BitQuery] Added new token:', token.name);
                }
              }
            } catch (error) {
              console.error('[BitQuery] Failed to parse message:', error);
            }
          };
        }
      };
    };

    ws.onclose = (event) => {
      console.log('[BitQuery] WebSocket disconnected:', event.code, event.reason);
      store.setConnected(false);

      if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttempts++;
        console.log(`[BitQuery] Attempting to reconnect (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`);
        reconnectTimeout = setTimeout(initializeWebSocket, RECONNECT_INTERVAL);
      } else {
        console.error('[BitQuery] Max reconnection attempts reached');
      }
    };

    ws.onerror = (error) => {
      console.error('[BitQuery] WebSocket error:', error);
      store.setConnected(false);
    };
  } catch (error) {
    console.error('[BitQuery] Failed to initialize WebSocket:', error);
    store.setConnected(false);

    if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
      reconnectAttempts++;
      console.log(`[BitQuery] Attempting to reconnect (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`);
      reconnectTimeout = setTimeout(initializeWebSocket, RECONNECT_INTERVAL);
    }
  }
}

// Initialize connection when in browser
if (typeof window !== 'undefined') {
  initializeWebSocket();
}

// Function to fetch initial token data
export async function fetchRealTimeTokens(): Promise<Token[]> {
  try {
    // For now, return empty array since we'll get real-time updates via WebSocket
    return [];
  } catch (error) {
    console.error('[BitQuery] Error fetching tokens:', error);
    return [];
  }
}
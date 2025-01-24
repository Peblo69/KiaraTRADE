import { useUnifiedTokenStore } from './unified-token-store';
import { initializeHeliusWebSocket } from './helius-websocket';
import { WebSocket } from 'isomorphic-ws';

// PumpPortal WebSocket Constants
const PUMP_PORTAL_WS_URL = 'wss://mainnet.helius-rpc.com/v0/ws';
const RECONNECT_DELAY = 5000;
const MAX_RECONNECT_ATTEMPTS = 10;

let ws: WebSocket | null = null;
let reconnectTimeout: NodeJS.Timeout | null = null;
let reconnectAttempts = 0;
let isConnecting = false;
let solPrice = 0;

function initializePumpPortalWebSocket() {
  if (typeof window === 'undefined' || isConnecting) return;

  const store = useUnifiedTokenStore.getState();

  // Cleanup existing connection
  if (ws) {
    try {
      ws.close();
    } catch (e) {
      console.error('[PumpPortal] Error closing WebSocket:', e);
    }
    ws = null;
  }

  isConnecting = true;

  try {
    console.log('[PumpPortal] Initializing WebSocket...');
    ws = new WebSocket(PUMP_PORTAL_WS_URL);

    ws.onopen = () => {
      console.log('[PumpPortal] WebSocket connected');
      store.setConnected(true);
      reconnectAttempts = 0;
      isConnecting = false;

      // Subscribe to SOL price updates
      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          jsonrpc: '2.0',
          method: 'subscribe',
          params: ['SOL_USD'],
          id: 'sol-price'
        }));
      }
    };

    ws.onmessage = async (event) => {
      try {
        const data = JSON.parse(event.data.toString());

        // Handle SOL price updates
        if (data.type === 'price' && data.symbol === 'SOL') {
          solPrice = parseFloat(data.price);
          console.log('[PumpPortal] Setting SOL price:', solPrice);
        }

        // Handle token creation events
        if (data.type === 'create') {
          const token = {
            address: data.mint,
            name: data.name || '',
            symbol: data.symbol || '',
            decimals: data.decimals || 0,
            marketCap: 0,
            marketCapSol: 0,
            liquidityAdded: false,
            holders: 0,
            price: 0,
            volume24h: 0,
            imageUrl: data.imageLink || '',
            uri: data.uri || '',
            trades: [],
            source: 'pumpportal' as const
          };

          store.addToken(token);
        }

      } catch (error) {
        console.error('[PumpPortal] Error processing message:', error);
      }
    };

    ws.onclose = () => {
      console.log('[PumpPortal] WebSocket disconnected');
      store.setConnected(false);
      isConnecting = false;

      if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttempts++;
        console.log(`[PumpPortal] Attempting reconnect ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}`);
        reconnectTimeout = setTimeout(initializePumpPortalWebSocket, RECONNECT_DELAY);
      }
    };

    ws.onerror = (error) => {
      console.error('[PumpPortal] WebSocket error:', error);
      store.setConnected(false);
      isConnecting = false;
    };

  } catch (error) {
    console.error('[PumpPortal] Failed to initialize WebSocket:', error);
    store.setConnected(false);
    isConnecting = false;

    if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
      reconnectAttempts++;
      reconnectTimeout = setTimeout(initializePumpPortalWebSocket, RECONNECT_DELAY);
    }
  }
}

export function initializeUnifiedWebSocket() {
  // Initialize both WebSocket connections
  initializeHeliusWebSocket();
  initializePumpPortalWebSocket();

  // Request updates for existing tokens
  const store = useUnifiedTokenStore.getState();
  const existingTokens = store.tokens;
  if (existingTokens.length > 0) {
    const tokenAddresses = existingTokens.map(t => t.address);
    console.log('[Unified] Requesting updates for existing tokens:', tokenAddresses.length);
  }
}

// Clean up function for testing and hot reloading
export function cleanup() {
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
    reconnectTimeout = null;
  }

  if (ws) {
    try {
      ws.close();
    } catch (e) {
      console.error('[PumpPortal] Error closing WebSocket during cleanup:', e);
    }
    ws = null;
  }

  reconnectAttempts = 0;
  isConnecting = false;
}

// Initialize WebSocket connections
initializeUnifiedWebSocket();
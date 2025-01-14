let ws: WebSocket | null = null;
let reconnectTimeout: NodeJS.Timeout | null = null;
const MAX_RECONNECT_DELAY = 5000;
const INITIAL_RECONNECT_DELAY = 1000;

export interface BinanceTickerData {
  symbol: string;
  price: string;
  change24h: string;
}

export function connectToWebSocket(onMessage?: (data: BinanceTickerData) => void) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    return ws;
  }

  // Clear any existing reconnection attempts
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
    reconnectTimeout = null;
  }

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}/ws`;

  try {
    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('Connected to WebSocket server');
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (onMessage) {
          onMessage(data);
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    ws.onclose = () => {
      console.log('WebSocket connection closed');

      // Attempt to reconnect with exponential backoff
      const reconnectDelay = Math.min(
        INITIAL_RECONNECT_DELAY * Math.pow(2, Math.floor(Math.random() * 4)),
        MAX_RECONNECT_DELAY
      );

      reconnectTimeout = setTimeout(() => {
        console.log(`Attempting to reconnect in ${reconnectDelay}ms...`);
        connectToWebSocket(onMessage);
      }, reconnectDelay);

      ws = null;
    };

    return ws;
  } catch (error) {
    console.error('Error creating WebSocket connection:', error);
    return null;
  }
}

export function disconnectWebSocket() {
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
    reconnectTimeout = null;
  }

  if (ws) {
    ws.close();
    ws = null;
  }
}
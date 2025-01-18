import { useTokenStore } from './unified-token-store';

let ws: WebSocket | null = null;
let reconnectAttempt = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_INTERVALS = [5000, 10000, 15000, 30000, 60000];

export function connectWebSocket() {
  if (ws?.readyState === WebSocket.OPEN) return;

  const { setConnected, setError, addToken } = useTokenStore.getState();

  ws = new WebSocket(`wss://${window.location.host}/ws`);

  ws.onopen = () => {
    console.log('WebSocket Connected');
    setConnected(true);
    reconnectAttempt = 0;
  };

  ws.onmessage = (event) => {
    try {
      const message = JSON.parse(event.data);

      if (message.type === 'token_update') {
        addToken(message.data);
      }

      if (message.type === 'connection_status') {
        setConnected(message.data.connected);
      }
    } catch (error) {
      console.error('Error processing message:', error);
    }
  };

  ws.onclose = () => {
    setConnected(false);
    if (reconnectAttempt < MAX_RECONNECT_ATTEMPTS) {
      const delay = RECONNECT_INTERVALS[reconnectAttempt] || RECONNECT_INTERVALS[RECONNECT_INTERVALS.length - 1];
      console.log(`WebSocket closed. Reconnecting in ${delay}ms (attempt ${reconnectAttempt + 1})`);
      setTimeout(connectWebSocket, delay);
      reconnectAttempt++;
    } else {
      setError('Maximum reconnection attempts reached. Please refresh the page.');
    }
  };

  ws.onerror = (error) => {
    console.error('WebSocket error:', error);
    setError('Connection error occurred. Please check your internet connection.');
  };
}

export function closeWebSocket() {
  if (ws) {
    ws.close();
    ws = null;
  }
}
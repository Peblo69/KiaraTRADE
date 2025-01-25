import { WebSocket } from 'ws';
import { wsManager } from './websocket';

// Extended WebSocket interface to include isAlive property
interface ExtendedWebSocket extends WebSocket {
  isAlive: boolean;
}

// PumpPortal WebSocket configuration
const PUMPPPORTAL_WS_URL = 'wss://pumpportal.fun/api/data';

export function initializePumpPortalWebSocket() {
  let ws: ExtendedWebSocket | null = null;
  let reconnectAttempts = 0;
  const MAX_RECONNECT_ATTEMPTS = 10;
  const RECONNECT_DELAY = 5000;

  function connect() {
    try {
      console.log('[PumpPortal] Connecting to WebSocket...');
      ws = new WebSocket(PUMPPPORTAL_WS_URL) as ExtendedWebSocket;
      ws.isAlive = true;

      ws.on('open', () => {
        console.log('[PumpPortal] WebSocket connected');
        reconnectAttempts = 0;

        // Subscribe to new token events
        if (ws?.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            method: "subscribeNewToken",
            keys: []
          }));
        }
      });

      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());

          if (message.message?.includes('Successfully subscribed')) {
            return;
          }

          if (message.errors) {
            console.error('[PumpPortal] Error received:', message.errors);
            return;
          }

          // Broadcast message to all connected clients
          wsManager.broadcast({
            type: 'pump_portal',
            data: message
          });

        } catch (error) {
          console.error('[PumpPortal] Error processing message:', error);
        }
      });

      ws.on('close', () => {
        console.log('[PumpPortal] WebSocket closed');
        ws = null;

        if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttempts++;
          console.log(`[PumpPortal] Attempting reconnect ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}`);
          setTimeout(connect, RECONNECT_DELAY);
        }
      });

      ws.on('error', (error) => {
        console.error('[PumpPortal] WebSocket error:', error);
        if (ws) {
          ws.close();
        }
      });

    } catch (error) {
      console.error('[PumpPortal] Failed to initialize WebSocket:', error);
      if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttempts++;
        console.log(`[PumpPortal] Attempting reconnect ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}`);
        setTimeout(connect, RECONNECT_DELAY);
      }
    }
  }

  // Start initial connection
  connect();

  return {
    sendMessage: (message: any) => {
      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
      }
    }
  };
}
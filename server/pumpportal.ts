import { Server as WebSocketServer, WebSocket } from 'ws';
import axios from 'axios';
import { log } from './vite';

const PUMP_PORTAL_WS_URL = 'wss://pumpportal.fun/api/data';
const TOTAL_SUPPLY = 1_000_000_000;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY = 5000;

let ws: WebSocket | null = null;
let reconnectAttempts = 0;

export const initializePumpPortalWebSocket = (wss: WebSocketServer) => {
  const connect = () => {
    ws = new WebSocket(PUMP_PORTAL_WS_URL);

    ws.onopen = () => {
      log('[PumpPortal] WebSocket connected');
      reconnectAttempts = 0;

      // Subscribe to new tokens
      ws?.send(JSON.stringify({
        method: "subscribeNewToken",
        keys: []
      }));
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data.toString());

        if (data.message?.includes('Successfully subscribed')) {
          log('[PumpPortal] Subscription confirmed:', data.message);
          return;
        }

        if (data.errors) {
          console.error('[PumpPortal] Error received:', data.errors);
          return;
        }

        // Handle token creation events
        if (data.txType === 'create' && data.mint) {
          log('[PumpPortal] New token created:', data.mint);

          // Broadcast to all connected clients
          wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({ 
                type: 'newToken',
                data: data
              }));
            }
          });

          // Subscribe to trades for the new token
          ws?.send(JSON.stringify({
            method: "subscribeTokenTrade",
            keys: [data.mint]
          }));
        }

        // Handle trade events
        else if (['buy', 'sell'].includes(data.txType) && data.mint) {
          // Broadcast trade data to all connected clients
          wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({ 
                type: 'trade',
                data: data
              }));
            }
          });
        }
      } catch (error) {
        console.error('[PumpPortal] Failed to parse message:', error);
      }
    };

    ws.onclose = (event) => {
      log('[PumpPortal] WebSocket disconnected:', event.reason);
      if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttempts++;
        log(`[PumpPortal] Attempting reconnect ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}`);
        setTimeout(connect, RECONNECT_DELAY * Math.pow(1.5, reconnectAttempts));
      } else {
        console.error('[PumpPortal] Max reconnection attempts reached');
      }
    };

    ws.onerror = (error) => {
      console.error('[PumpPortal] WebSocket error:', error);
      ws?.close();
    };
  };

  connect();
  return ws;
};
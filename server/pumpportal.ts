import { WebSocket } from 'ws';
import axios from 'axios';
import { log } from './vite';
import { wsManager } from './services/websocket';

const PUMP_PORTAL_WS_URL = 'wss://pumpportal.fun/api/data';
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY = 5000;

let ws: WebSocket | null = null;
let reconnectAttempts = 0;

export const initializePumpPortalWebSocket = () => {
  const connect = () => {
    try {
      ws = new WebSocket(PUMP_PORTAL_WS_URL, {
        handshakeTimeout: 10000
      });

      ws.on('open', () => {
        log('[PumpPortal] WebSocket connected');
        reconnectAttempts = 0;

        // Subscribe to new tokens
        ws?.send(JSON.stringify({
          method: "subscribeNewToken",
          keys: []
        }));
      });

      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());

          if (message.message?.includes('Successfully subscribed')) {
            log('[PumpPortal] Subscription confirmed:', message.message);
            return;
          }

          if (message.errors) {
            console.error('[PumpPortal] Error received:', message.errors);
            return;
          }

          // Handle token creation events
          if (message.txType === 'create' && message.mint) {
            log('[PumpPortal] New token created:', message.mint);

            // Broadcast to all connected clients through our WebSocket manager
            wsManager.broadcast({ 
              type: 'newToken',
              data: message
            });

            // Subscribe to trades for the new token
            ws?.send(JSON.stringify({
              method: 'subscribeTokenTrade',
              keys: [message.mint]
            }));
          }

          // Handle trade events
          else if (['buy', 'sell'].includes(message.txType) && message.mint) {
            // Broadcast trade data to all connected clients
            wsManager.broadcast({ 
              type: 'trade',
              data: message
            });
          }
        } catch (error) {
          console.error('[PumpPortal] Failed to parse message:', error);
        }
      });

      ws.on('close', () => {
        log('[PumpPortal] WebSocket disconnected');
        if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttempts++;
          log(`[PumpPortal] Attempting reconnect ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}`);
          setTimeout(connect, RECONNECT_DELAY * Math.pow(1.5, reconnectAttempts));
        } else {
          console.error('[PumpPortal] Max reconnection attempts reached');
        }
      });

      ws.on('error', (error) => {
        console.error('[PumpPortal] WebSocket error:', error);
        ws?.close();
      });
    } catch (error) {
      console.error('[PumpPortal] Failed to initialize WebSocket:', error);
      if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttempts++;
        setTimeout(connect, RECONNECT_DELAY * Math.pow(1.5, reconnectAttempts));
      }
    }
  };

  connect();
  return ws;
};
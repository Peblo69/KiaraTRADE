import { WebSocket } from 'ws';
import axios from 'axios';
import { log } from './vite';
import { wsManager } from './services/websocket';
import { rugcheckService } from './services/rugcheck';
import { TokenWithRisk, WebSocketMessage } from '../Solana Sniper/src/types';

const PUMP_PORTAL_WS_URL = 'wss://pumpportal.fun/api/data';
const TOTAL_SUPPLY = 1_000_000_000;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY = 5000;

let ws: WebSocket | null = null;
let reconnectAttempts = 0;
// Track active tokens being viewed
const activeTokens = new Set<string>();

export const initializePumpPortalWebSocket = () => {
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

    ws.onmessage = async (event) => {
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

          // Get rug check data
          const rugReport = await rugcheckService.getTokenReport(data.mint);

          // Prepare token data with risk indicators
          const tokenData: TokenWithRisk = {
            mint: data.mint,
            name: data.name || 'Unknown',
            symbol: data.symbol || 'Unknown',
            riskScore: rugReport?.score || 0,
            riskIndicators: rugReport ? rugcheckService.getDetailedRiskInfo(rugReport) : '',
            detailedRisk: rugReport || undefined
          };

          // Broadcast to all connected clients
          wsManager.broadcast({ 
            type: 'newToken',
            data: tokenData
          });

          // Subscribe to trades for the new token
          ws?.send(JSON.stringify({
            method: "subscribeTokenTrade",
            keys: [data.mint]
          }));
        }

        // Handle trade events
        else if (['buy', 'sell'].includes(data.txType) && data.mint) {
          // Broadcast trade data
          wsManager.broadcast({ 
            type: 'trade',
            data: data
          });

          // If this token is being actively viewed, update its risk data
          if (activeTokens.has(data.mint)) {
            const rugReport = await rugcheckService.getTokenReport(data.mint);
            if (rugReport) {
              wsManager.broadcast({
                type: 'tokenUpdate',
                data: {
                  mint: data.mint,
                  name: data.name || 'Unknown',
                  symbol: data.symbol || 'Unknown',
                  riskScore: rugReport.score,
                  riskIndicators: rugcheckService.getDetailedRiskInfo(rugReport),
                  detailedRisk: rugReport
                }
              });
            }
          }
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

// Add methods to manage active tokens
export const addActiveToken = (mint: string) => {
  activeTokens.add(mint);
};

export const removeActiveToken = (mint: string) => {
  activeTokens.delete(mint);
};
import type { Express } from "express";
import { createServer, type Server } from "http";
import { wsManager } from './services/websocket';
import { WebSocket } from 'ws';

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
}

// In-memory data structure for tokens
const tokens: Record<string, TokenData> = {};
let pumpPortalWs: WebSocket | null = null;
let reconnectTimeout: NodeJS.Timeout | null = null;
let isConnecting = false;

export function registerRoutes(app: Express): Server {
  const httpServer = createServer(app);

  // Initialize WebSocket manager
  wsManager.initialize(httpServer);

  // Setup external data source connection
  const connectToDataSource = () => {
    if (isConnecting) {
      console.log('[Data Source] Connection attempt already in progress');
      return;
    }

    if (pumpPortalWs?.readyState === WebSocket.OPEN) {
      console.log('[Data Source] Already connected to PumpPortal');
      return;
    }

    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
      reconnectTimeout = null;
    }

    try {
      isConnecting = true;
      console.log('[Data Source] Attempting to connect to PumpPortal...');
      pumpPortalWs = new WebSocket('wss://pumpportal.fun/api/data');

      pumpPortalWs.on('open', () => {
        console.log('[Data Source] Connected successfully to PumpPortal');
        isConnecting = false;

        wsManager.broadcast({
          type: 'connection_status',
          status: 'connected'
        });

        if (pumpPortalWs?.readyState === WebSocket.OPEN) {
          pumpPortalWs.send(JSON.stringify({
            method: "subscribeNewToken"
          }));
        }
      });

      pumpPortalWs.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());

          if (message.txType === 'create' || message.txType === 'trade') {
            const tokenAddress = message.mint;
            if (!tokenAddress) return;

            const price = message.solAmount / (message.tokenAmount || message.initialBuy);

            if (message.txType === 'create') {
              const token: TokenData = {
                name: message.name || 'Unknown',
                symbol: message.symbol || 'UNKNOWN',
                marketCap: message.marketCapSol || 0,
                marketCapSol: message.marketCapSol || 0,
                liquidityAdded: message.pool === "pump",
                holders: message.holders || 0,
                volume24h: message.volume24h || 0,
                address: tokenAddress,
                price,
                imageUrl: `https://pumpfun.fun/i/${tokenAddress}/image`
              };

              // Only broadcast if token data has changed
              const existingToken = tokens[tokenAddress];
              if (!existingToken || 
                  existingToken.price !== token.price || 
                  existingToken.marketCapSol !== token.marketCapSol ||
                  existingToken.volume24h !== token.volume24h) {
                tokens[tokenAddress] = token;
                wsManager.broadcast({
                  type: 'token',
                  data: token
                });
              }
            } else if (tokens[tokenAddress]) {
              // Update existing token only if data has changed
              const updatedToken = {
                ...tokens[tokenAddress],
                price,
                marketCapSol: message.marketCapSol || tokens[tokenAddress].marketCapSol,
                volume24h: message.volume24h || tokens[tokenAddress].volume24h
              };

              if (tokens[tokenAddress].price !== updatedToken.price ||
                  tokens[tokenAddress].marketCapSol !== updatedToken.marketCapSol ||
                  tokens[tokenAddress].volume24h !== updatedToken.volume24h) {
                tokens[tokenAddress] = updatedToken;
                wsManager.broadcast({
                  type: 'token',
                  data: updatedToken
                });
              }
            }
          }
        } catch (error) {
          console.error('[Data Source] Error processing message:', error);
        }
      });

      pumpPortalWs.on('error', (error) => {
        console.error('[Data Source] WebSocket error:', error);
        isConnecting = false;
      });

      pumpPortalWs.on('close', () => {
        console.log('[Data Source] Connection closed, attempting to reconnect...');
        isConnecting = false;

        wsManager.broadcast({
          type: 'connection_status',
          status: 'disconnected'
        });

        if (!reconnectTimeout) {
          reconnectTimeout = setTimeout(connectToDataSource, 5000);
        }
      });

    } catch (error) {
      console.error('[Data Source] Failed to establish connection:', error);
      isConnecting = false;

      if (!reconnectTimeout) {
        reconnectTimeout = setTimeout(connectToDataSource, 5000);
      }
    }
  };

  // Start connection to data source
  connectToDataSource();

  // REST endpoints
  app.get('/api/tokens', (_req, res) => {
    res.json(Object.values(tokens).sort((a, b) => b.marketCapSol - a.marketCapSol));
  });

  return httpServer;
}
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

export function registerRoutes(app: Express): Server {
  const httpServer = createServer(app);

  // Initialize WebSocket manager
  wsManager.initialize(httpServer);

  // Setup external data source connection
  const connectToDataSource = () => {
    console.log('[Data Source] Attempting to connect to PumpPortal...');
    const ws = new WebSocket('wss://pumpportal.fun/api/data');

    ws.on('open', () => {
      console.log('[Data Source] Connected successfully to PumpPortal');
      ws.send(JSON.stringify({
        method: "subscribeNewToken"
      }));
    });

    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        console.log('[Data Source] Received message type:', message.txType);

        if (message.txType === 'create' || message.txType === 'trade') {
          const price = message.solAmount / (message.tokenAmount || message.initialBuy);
          const tokenAddress = message.mint;

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

            tokens[tokenAddress] = token;
            console.log('[Data Source] New token created:', {
              address: token.address,
              name: token.name,
              symbol: token.symbol
            });

            // Broadcast to all connected clients
            wsManager.broadcast({
              type: 'token',
              data: token
            });
          } else {
            // Update existing token
            if (tokens[tokenAddress]) {
              tokens[tokenAddress] = {
                ...tokens[tokenAddress],
                price,
                marketCapSol: message.marketCapSol || tokens[tokenAddress].marketCapSol,
                volume24h: message.volume24h || tokens[tokenAddress].volume24h
              };

              // Broadcast update
              wsManager.broadcast({
                type: 'token',
                data: tokens[tokenAddress]
              });
            }
          }
        }
      } catch (error) {
        console.error('[Data Source] Error processing message:', error);
      }
    });

    ws.on('error', (error) => {
      console.error('[Data Source] WebSocket error:', error);
    });

    ws.on('close', () => {
      console.log('[Data Source] Connection closed, attempting to reconnect...');
      setTimeout(connectToDataSource, 5000);
    });
  };

  // Start connection to data source
  connectToDataSource();

  // REST endpoints
  app.get('/api/tokens', (_req, res) => {
    console.log('[REST] Fetching all tokens');
    res.json(Object.values(tokens));
  });

  return httpServer;
}
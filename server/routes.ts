import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";

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

// In-memory data structure for candles and tokens
const tokenCandles: Record<string, Array<{
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}>> = {};

const tokens: Record<string, TokenData> = {};

export function registerRoutes(app: Express): Server {
  const httpServer = createServer(app);
  const wss = new WebSocketServer({ noServer: true });

  // Handle WebSocket upgrade
  httpServer.on('upgrade', (request, socket, head) => {
    // Skip vite HMR connections
    if (request.headers['sec-websocket-protocol'] === 'vite-hmr') {
      console.log('[WebSocket] Skipping vite-hmr connection');
      return;
    }

    console.log('[WebSocket] Handling upgrade request');
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  });

  // Handle WebSocket connections
  wss.on('connection', (ws) => {
    console.log('[WebSocket] Client connected to aggregator');

    // Send existing tokens to new client
    Object.values(tokens).forEach(token => {
      ws.send(JSON.stringify({
        type: 'new_token',
        token
      }));
    });

    // Connect to PumpFun WebSocket
    const pumpFunWs = new WebSocket('wss://pumpportal.fun/api/data');

    pumpFunWs.addEventListener('open', () => {
      console.log('[PumpFun] WebSocket connected');
      // Subscribe to new token events
      pumpFunWs.send(JSON.stringify({
        method: "subscribeNewToken"
      }));
    });

    pumpFunWs.addEventListener('message', (event) => {
      try {
        const message = JSON.parse(event.data.toString());
        console.log('[PumpFun] Received message:', message.txType);

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
            console.log('[PumpFun] New token created:', {
              address: token.address,
              name: token.name,
              symbol: token.symbol
            });

            broadcast(wss, {
              type: 'new_token',
              token
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

              broadcast(wss, {
                type: 'token_update',
                tokenAddress,
                token: tokens[tokenAddress]
              });
            }
          }

          // Update candle data
          const trade = {
            tokenAddress,
            price,
            volume: message.solAmount,
            timestamp: Date.now()
          };

          console.log('[PumpFun] Processing trade:', {
            tokenAddress: trade.tokenAddress,
            price: trade.price,
            volume: trade.volume
          });

          updateCandle(trade);

          // Broadcast the updated candle
          const candle = getCurrentCandle(trade.tokenAddress);
          if (candle) {
            broadcast(wss, {
              type: 'candle_update',
              tokenAddress: trade.tokenAddress,
              candle
            });
          }
        }
      } catch (error) {
        console.error('[PumpFun] Error processing message:', error);
      }
    });

    pumpFunWs.addEventListener('error', (error) => {
      console.error('[PumpFun] WebSocket error:', error);
    });

    pumpFunWs.addEventListener('close', () => {
      console.log('[PumpFun] WebSocket closed');
    });

    ws.on('close', () => {
      console.log('[WebSocket] Client disconnected from aggregator');
      if (pumpFunWs.readyState === WebSocket.OPEN) {
        pumpFunWs.close();
      }
    });
  });

  // REST endpoints
  app.get('/api/tokens', (req, res) => {
    console.log('[REST] Fetching all tokens');
    res.json(Object.values(tokens));
  });

  app.get('/api/tokens/:address/candles', (req, res) => {
    const { address } = req.params;
    console.log('[REST] Fetching candles for token:', address);
    const candles = tokenCandles[address] || [];
    res.json(candles);
  });

  return httpServer;
}

// Helper functions for candle management
function updateCandle(trade: { tokenAddress: string; price: number; volume: number; timestamp: number }) {
  const timeframe = 5 * 60 * 1000; // 5-minute candles
  const candleTimestamp = Math.floor(trade.timestamp / timeframe) * timeframe;

  if (!tokenCandles[trade.tokenAddress]) {
    tokenCandles[trade.tokenAddress] = [];
  }

  const candles = tokenCandles[trade.tokenAddress];
  let currentCandle = candles[candles.length - 1];

  if (!currentCandle || currentCandle.timestamp !== candleTimestamp) {
    // Create new candle
    currentCandle = {
      timestamp: candleTimestamp,
      open: trade.price,
      high: trade.price,
      low: trade.price,
      close: trade.price,
      volume: trade.volume
    };
    candles.push(currentCandle);
    console.log('[Candles] Created new candle for token:', trade.tokenAddress);
  } else {
    // Update existing candle
    currentCandle.high = Math.max(currentCandle.high, trade.price);
    currentCandle.low = Math.min(currentCandle.low, trade.price);
    currentCandle.close = trade.price;
    currentCandle.volume += trade.volume;
    console.log('[Candles] Updated existing candle for token:', trade.tokenAddress);
  }

  // Keep only last 24 hours of candles
  const cutoffTime = Date.now() - (24 * 60 * 60 * 1000);
  tokenCandles[trade.tokenAddress] = candles.filter(c => c.timestamp > cutoffTime);
}

function getCurrentCandle(tokenAddress: string) {
  const candles = tokenCandles[tokenAddress];
  return candles ? candles[candles.length - 1] : null;
}

function broadcast(wss: WebSocketServer, data: any) {
  const message = JSON.stringify(data);
  let clientCount = 0;

  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
      clientCount++;
    }
  });

  console.log(`[WebSocket] Broadcasted update to ${clientCount} clients:`, {
    type: data.type,
    tokenAddress: data.tokenAddress
  });
}